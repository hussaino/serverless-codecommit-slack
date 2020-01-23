// import awsmobile from '../amplify/aws-exports-dev';
import * as aws from 'aws-sdk';
import axios from 'axios';

interface CodeCommitTriggerEvent {
	Records: [
		{
			awsRegion: string;
			codecommit: {
				references: [
					{
						commit: string;
						ref: string;
					}
				];
			};
			customData: null;
			eventId: string;
			eventName: string;
			eventPartNumber: number;
			eventSource: string;
			eventSourceARN: string;
			eventTime: string;
			eventTotalParts: number;
			eventTriggerConfigId: string;
			eventTriggerName: string;
			eventVersion: string;
			userIdentityARN: string;
		}
	];
}

const codecommit = new aws.CodeCommit({
	region: process.env.REGION || 'us-east-1',
});
export const handler = async (event: CodeCommitTriggerEvent) => {
	console.log(event);
	const repo_name = event.Records[0].eventSourceARN.substr(event.Records[0].eventSourceARN.lastIndexOf(':') + 1);
	const commitId = event.Records[0].codecommit.references[0].commit;
	const repo = await codecommit
		.getCommit({
			commitId,
			repositoryName: repo_name,
		})
		.promise();
	console.log(repo.commit);
	const branch = event.Records[0].codecommit.references[0].ref.substr(
		event.Records[0].codecommit.references[0].ref.lastIndexOf('/') + 1,
	);
	const user = repo.commit.author!.name;
	const message = repo.commit.message;
	const url = `https://${process.env.REGION ||
		'us-east-1'}.console.aws.amazon.com/codesuite/codecommit/repositories/${repo_name}/commit/${repo.commit
		.commitId}`;

	if (!process.env.WEBHOOK_URL) {
		return;
	}
	const res = await axios.post(
		process.env.WEBHOOK_URL,
		JSON.stringify({
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: 'A new commit was pushed',
					},
				},
				{
					type: 'section',
					fields: [
						{
							type: 'mrkdwn',
							text: `*Repo:*\n${repo_name}`,
						},
						{
							type: 'mrkdwn',
							text: `*Branch:*\n${branch}`,
						},
						{
							type: 'mrkdwn',
							text: `*User:*\n${user}`,
						},
						{
							type: 'mrkdwn',
							text: `*Commit:*\n<${url}|${commitId.substr(0, 8)}>`,
						},
						{
							type: 'mrkdwn',
							text: `*Message:*\n${message}`,
						},
					],
				},
			],
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		},
	);
	return res.data;
};
