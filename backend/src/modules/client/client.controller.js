const ApiResponce = require('../../utils/apiResponse');
const { createClient, getClients, getClientById, updateClient, deleteClient, deleteClientPermanently, restoreClient, remindClient } = require('./client.service');
const asyncHandler = require('../../utils/asyncHandler');
const { default: mongoose } = require('mongoose');

const createClientHandler = asyncHandler( async(req, res) => {
        const client = await createClient(req.user.id, req.body);
        res.status(201).json( new ApiResponce(201, 'Client created successfully', client));

        if(!client) {
            const error = new Error('Error creating client');
            error.statusCode = 500;
            throw error;
        }
});

const getClientsHandler = asyncHandler( async(req, res) => {
        const clients = await getClients(req.user.id);
        res.json(new ApiResponce(200, 'Clients retrieved successfully', clients));

        if(!clients) {
        const error = new Error('No clients yet created');
        error.statusCode = 404;
        throw error;
        }
});

const getClientByIdHandler = asyncHandler( async(req, res) => {
        const client = await getClientById(req.params.id, req.user.id);

        if (!client) {
        const error = new Error('Client not found');
        error.statusCode = 404;
        throw error;
        }

        res.json(new ApiResponce(200, 'Client retrieved successfully', client));
});

const updateClientHandler = asyncHandler( async(req, res) => {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
            const error = new Error('Invalid client ID');
            error.statusCode = 400;
            throw error;
        }
        const client = await updateClient(req.params.id, req.user.id, req.body);
        if (!client) {
        const error = new Error('Client not found');
        error.statusCode = 404;
        throw error;
        }

        res.json(new ApiResponce(200, 'Client updated successfully', client));
});

const deleteClientHandler = asyncHandler( async(req, res) => {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
            const error = new Error('Invalid client ID');
            error.statusCode = 400;
            throw error;
        }
        const client = await deleteClient(req.params.id, req.user.id);

        if (!client) {
        const error = new Error('Client not found');
        error.statusCode = 404;
        throw error;
        }

        res.json(new ApiResponce(200, 'Client deleted successfully', client));

});

const deleteClientPermanentlyHandler = asyncHandler( async(req, res) => {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
            const error = new Error('Invalid client ID');
                error.statusCode = 400;
                throw error;
        }
        const message = await deleteClientPermanently(req.params.id, req.user.id);
        res.json(new ApiResponce(200, message));
});

const restoreClientHandler = asyncHandler( async(req, res) => {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
            const error = new Error('Invalid client ID');
            error.statusCode = 400;
            throw error;
        }
        const client = await restoreClient(req.params.id, req.user.id);

        if (!client) {
        const error = new Error('Client not found');
        error.statusCode = 404;
        throw error;
        }

        res.json(new ApiResponce(200, 'Client restored successfully', client));

});

const remindClientHandler = asyncHandler( async(req, res) => {
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
                const error = new Error('Invalid client ID');
                error.statusCode = 400;
                throw error;
        }
        console.log("Remind client handler called with ID:", req.params.id);
        const message = await remindClient(req.params.id, req.user.id);
        res.json(new ApiResponce(200, message));
});

module.exports = {
    createClientHandler,
    getClientsHandler,
    getClientByIdHandler,
    updateClientHandler,
    deleteClientHandler,
    deleteClientPermanentlyHandler,
    restoreClientHandler,
    remindClientHandler
};