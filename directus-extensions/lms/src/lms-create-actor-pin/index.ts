import { createHash } from 'crypto';
import { defineEndpoint } from '@directus/extensions-sdk';
import { sendAccessPinEmail } from '../utils';

function generateUnique6DigitPin(id: string): number {
	const salt = Math.floor(Math.random() * 1000000);
	const saltedId = id.replace(/-/g, '') + salt.toString();
	const hash = createHash('sha256').update(saltedId).digest('hex');
	const idHash = parseInt(hash.slice(0, 8), 16);
	const sixDigitNumber = (idHash % 900000) + 100000;
	return sixDigitNumber;
}

function validatePayload(payload: any) {
	const requiredKeys = ['first_name', 'last_name', 'email', 'role', 'token', 'organization_id'];
	const errors: any[] = [];

	if (!Array.isArray(payload)) {
		errors.push('The payload must be an array.');
		return errors;
	}

	payload.forEach((entry, index) => {
		const missingKeys = requiredKeys.filter((key) => !entry[key]);

		if (missingKeys.length > 0) {
			errors.push({
				message: `Entry ${index + 1} is missing or has empty values for the following keys: ${missingKeys.join(', ')}`,
			});
		}
	});

	return errors;
}

function extendPayloadWithUserId(payload: any, users: any) {
	return payload.map((entry: any) => {
		const matchUser = users.find((user: any) => user.email === entry.email);
		return matchUser
			? {
					...entry,
					user_id: matchUser.id,
					access_pin: generateUnique6DigitPin(matchUser.id),
			  }
			: entry;
	});
}

export default defineEndpoint((router, { services, getSchema, database, logger }) => {
	router.post('/', async (req, res) => {
		let trx: any;
		let schema: any;
		let extendedUsers: any;
		let transactionCommitted = false;

		try {
			const reqPayload = req.body;

			if (!reqPayload || typeof reqPayload !== 'object') {
				return res.status(400).json({
					errors: [{ message: 'Invalid request payload.' }],
				});
			}

			const validationErrors = validatePayload(reqPayload);

			if (validationErrors.length > 0) {
				return res.status(400).json({
					errors: validationErrors,
				});
			}

			trx = await database.transaction();
			schema = await getSchema();

			const userService = new services.UsersService({
				schema,
				knex: trx,
				accountability: req.accountability,
			});

			const createdUserIds = await userService.createMany(reqPayload);

			if (!createdUserIds || createdUserIds.length === 0) {
				throw new Error('Failed to create users.');
			}

			const createdUsers = await trx('directus_users').select('*').whereIn('id', createdUserIds);

			extendedUsers = extendPayloadWithUserId(reqPayload, createdUsers);

			const actorAccessService = new services.ItemsService('lms_actor_access', {
				schema,
				knex: trx,
				accountability: req.accountability,
			});

			const actors = await actorAccessService.createMany(extendedUsers);

			if (!actors || actors.length === 0) {
				throw new Error('Failed to create actor access entries.');
			}

			await trx.commit();
			transactionCommitted = true;

			return res.status(200).json({
				data: actors,
				message: 'Actor access successfully added.',
			});
		} catch (error) {
			logger.error('Error in actor access creation:');
			logger.error(error);

			if (trx) {
				try {
					await trx.rollback();
				} catch (rollbackError) {
					logger.error('Error rolling back transaction:');
					logger.error(rollbackError);
				}
			}

			return res.status(500).json({
				errors: [{ message: (error as any).message || 'Internal server error.' }],
			});
		} finally {
			if (transactionCommitted && extendedUsers.length > 0) {
				try {
					const mailService = new services.MailService({ schema });

					await Promise.all(
						extendedUsers.map((user: any) => sendAccessPinEmail(mailService, user.email, { pinCode: user.access_pin })),
					);
				} catch (emailError) {
					logger.error('Error sending emails:', emailError);
				}
			}
		}
	});
});
