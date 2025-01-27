export async function sendAccessPinEmail(mailServiceInstance: any, to: string, templateData: Record<string, any>) {
	const EMAIL_SUBJECT = 'Access granted to Xrtemis';
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
