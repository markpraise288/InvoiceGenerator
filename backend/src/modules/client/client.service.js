const Invoice = require('../invoices/invoice.model');
const Client = require('./client.model');
const { notificationService } = require('../notifications/notification.service');
const generateInvoicePDF = require('../../utils/generateInvoicePdf');
const User = require('../users/user.model');
const { emailQueue } = require('../../infrastructure/queues/email.queue');

const createClient = async (userId, clientData) => {
    const client = await Client.create({ ...clientData, userId: userId });

    // Trigger notification for client creation
    await notificationService.createNotification({
        userId: userId,
        title: 'New Client Created',
        description: `Client ${client.name} has been added to your account.`,
        type: 'client'
    });
    return client;
}

const getClients = async (userId) => {
    const clients = Client.find({ userId });
    return clients;
}

const getClientById = async (clientId, userId) => {
    const client = Client.findOne({ _id: clientId, userId, isDeletedAt: false });
    return client;
}

const updateClient = async (clientId, userId, updateData) => {
    const client = Client.findOneAndUpdate(
        { _id: clientId, userId, isDeletedAt: false },  
        updateData,
        { returnDocument: 'after' }
    );
    return client;
}

const deleteClient = async (clientId, userId) => {
    const client = Client.findOneAndUpdate(
        { _id: clientId, userId, isDeletedAt: false },
        { isDeletedAt: true },
        { returnDocument: 'after' }
    );
    return client;
}

const deleteClientPermanently = async (clientId, userId) => {
    await Client.deleteOne({ _id: clientId, userId });
    return "Client permanently deleted";
}

const restoreClient = async (clientId, userId) => {
    const client = Client.findOneAndUpdate(
        { _id: clientId, userId, isDeletedAt: true },
        { isDeletedAt: false },
        { returnDocument: 'after' }
    );
    return client;
}

const remindClient = async (invoiceId, userId) => {
    const invoice = await Invoice.findOne({ _id: invoiceId, userId, isDeleted: false });
    if (!invoice) {
        throw new Error('Invoice not found');
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const filePath = await generateInvoicePDF(invoice, user, invoice.template);
    await emailQueue.add('Remind Email', {
        to: invoice.clientSnapshot.email,
        subject: 'Reminder',
        dueDate: invoice.dueDate,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientSnapshot.name,
        path: filePath,
        filename: `INV-${invoice.invoiceNumber}.pdf`
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
        }
    });
    return "Reminder sent";
}

module.exports = {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient,
    deleteClientPermanently,
    restoreClient,
    remindClient
};