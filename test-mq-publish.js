import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

async function sendTestMessage() {
    const queueName = 'university.document.requests';
    const connectionUrl = process.env.CLOUDAMQP_URL;

    if (!connectionUrl) {
        console.error("CLOUDAMQP_URL is missing from your .env file!");
        process.exit(1);
    }

    try {
        console.log('Connecting to CloudAMQP Broker...');
        const connection = await amqp.connect(connectionUrl);
        const channel = await connection.createChannel();

        // Ensure the queue exists before pushing to it
        await channel.assertQueue(queueName, { durable: true });

        // Build our test payload string
        const payload = {
            message: "Hello World from Node.js!",
            timestamp: new Date().toISOString()
        };

        console.log(`Sending message to queue [${queueName}]...`);
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
            persistent: true // Tells RabbitMQ to save the message to disk so it isn't lost
        });

        console.log('Message dispatched successfully!');

        // Close connections gracefully
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Failed to publish message:', error);
    }
}

sendTestMessage();
