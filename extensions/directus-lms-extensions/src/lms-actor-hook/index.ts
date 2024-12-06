import { createHash } from 'crypto';
import { defineHook } from '@directus/extensions-sdk';
import { EventContext } from '@directus/types';

function generateUnique6DigitPinFromUuid(uuid: string): number {
	const salt = Math.floor(Math.random() * 1000000);
	const saltedUuid = uuid.replace(/-/g, '') + salt.toString();
	const hash = createHash('sha256').update(saltedUuid).digest('hex');
	const uuidHash = parseInt(hash.slice(0, 8), 16);
	const sixDigitNumber = (uuidHash % 900000) + 100000;
	return sixDigitNumber;
}

async function getUserById(database: any, userId: string) {
	if (!userId) {
		throw new Error('User ID is required to fetch user data.');
	}

	const user = await database.from('directus_users').select('*').where({ id: userId }).first();

	if (!user) {
		throw new Error(`User with ID ${userId} not found.`);
	}

	return user;
}

async function sendEmail(mailServiceInstance: any, to: string, templateData: Record<string, any>) {
	const EMAIL_SUBJECT = 'Xrtemis Access';
	const TEMPLATE_NAME = 'actor-access-pin';

	const mailOptions = {
		to,
		subject: EMAIL_SUBJECT,
		template: {
			name: TEMPLATE_NAME,
			data: templateData,
		},
	};

	return mailServiceInstance.send(mailOptions);
}

export default defineHook(({ filter, action }, { services, getSchema, database, logger }) => {
	filter('lms_actor_access.items.update', async () => {
		throw new Error('Updates NOT allowed - Delete and recreate item');
	});

	filter('lms_actor_access.items.create', async (payload: any, _meta: Record<string, any>, _context: EventContext) => {
		const userId = payload?.user_id;

		if (!userId) {
			throw new Error('User ID is missing.');
		}

		if (!payload.access_pin) {
			const pinAccess = generateUnique6DigitPinFromUuid(userId);
			payload.access_pin = pinAccess;
			logger?.debug(`Auto generated access_pin: ${pinAccess} for user_id: ${userId}`);
		}

		return payload;
	});

	action('lms_actor_access.items.create', async (meta: Record<string, any>, _context: EventContext) => {
		const schema = await getSchema();
		const mailService = new services.MailService({ schema });

		const userId = meta.payload?.user_id;

		if (!userId) {
			throw new Error('User ID is missing.');
		}

		try {
			const { email: receiverEmail } = await getUserById(database, userId);
			const pinCode = meta.payload?.access_pin;

			if (!receiverEmail || !pinCode) {
				logger.error('Missing email or pinCode in context payload');
				logger.error(meta.payload);
				return;
			}

			await sendEmail(mailService, receiverEmail, { pinCode });
			logger.info(`Email sent successfully to ${receiverEmail} with pin access details`);
		} catch (error) {
			logger.error('Error sending pin access email:');
			logger.error(error);
		}
	});
});
