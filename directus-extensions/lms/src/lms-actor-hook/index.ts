import { createHash } from 'crypto';
import { defineHook } from '@directus/extensions-sdk';

function generateUnique6DigitPin(id: string): number {
	const salt = Math.floor(Math.random() * 1000000);
	const saltedId = id.replace(/-/g, '') + salt.toString();
	const hash = createHash('sha256').update(saltedId).digest('hex');
	const idHash = parseInt(hash.slice(0, 8), 16);
	const sixDigitNumber = (idHash % 900000) + 100000;
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
	const EMAIL_TEMPLATE_NAME = 'actor-access-pin';

	const mailOptions = {
		to,
		subject: EMAIL_SUBJECT,
		template: {
			name: EMAIL_TEMPLATE_NAME,
			data: templateData,
		},
	};

	return mailServiceInstance.send(mailOptions);
}

export default defineHook(({ filter, action }, { services, getSchema, database, logger }) => {
	filter('lms_actor_access.items.update', async () => {
		throw new Error('Updates NOT allowed - Delete and recreate item');
	});

	filter('lms_actor_access.items.create', async (payload: any, _meta: Record<string, any>, _context: unknown) => {
		const userId = payload?.user_id;

		if (!userId) {
			throw new Error('User ID is missing.');
		}

		if (!payload.access_pin) {
			// user_id may be uuid string or object if the user is created inline while creating this item
			const pinAccess = generateUnique6DigitPin(JSON.stringify(userId));
			payload.access_pin = pinAccess;
			logger?.debug(`Auto generated access_pin: ${pinAccess} for user_id: ${userId}`);
		}

		return payload;
	});

	action('lms_actor_access.items.create', async (meta: Record<string, any>, _context: unknown) => {
		const schema = await getSchema();
		const mailService = new services.MailService({ schema });

		const userId = meta.payload?.user_id;

		if (!userId) {
			throw new Error('User ID is missing.');
		}

		try {
			let receiverEmail;

			// user_id may be uuid string or object if the user is created inline while creating this item
			if (typeof userId === 'string') {
				const { email } = await getUserById(database, userId);
				receiverEmail = email;
			} else {
				const { email } = userId;
				receiverEmail = email;
			}

			const pinCode = meta.payload?.access_pin;

			if (!pinCode || !receiverEmail) {
				logger.error('Missing pinCode or email in context payload');
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
