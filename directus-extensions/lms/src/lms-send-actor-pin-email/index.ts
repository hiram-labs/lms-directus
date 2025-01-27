import { defineEndpoint } from '@directus/extensions-sdk';
import { sendAccessPinEmail } from '../utils';

export default defineEndpoint((router, { services, getSchema, database, logger }) => {
	router.post('/', async (req, res) => {
		try {
			const actorAccessId = req.body?.id;

			if (!actorAccessId) {
				return res.status(400).json({
					errors: [{ message: 'The "id" field is required in the request body.' }],
				});
			}

			const schema = await getSchema();

			const actorAccessService = new services.ItemsService('lms_actor_access', {
				schema,
				accountability: req.accountability,
			});

			const actorAccess = await actorAccessService.readOne(actorAccessId, { fields: ['access_pin', 'user_id.email'] });
			const mailService = new services.MailService({ schema });

			await sendAccessPinEmail(mailService, actorAccess.user_id.email, { pinCode: actorAccess.access_pin });

			res.status(200).json({
				data: actorAccess,
				message: 'Actor access details retrieved successfully.',
			});
		} catch (error) {
			logger.error('Error fetching actor access details:');
			logger.error(error);

			res.status(500).json({
				errors: [{ message: (error as any).message || 'Internal server error.' }],
			});
		}
	});
});
