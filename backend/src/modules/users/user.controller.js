const { createUser, getUserById, updateUser } = require('./user.service');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

const createUserHandler = asyncHandler( async(req, res) => {
        const user = await createUser(req.body);
        if(!user) {
            throw new ApiError(500, 'Error creating user');
        }
        res.status(201).json( new ApiResponse(true, 'User created successfully', user) );
});

const getUserHandler = asyncHandler( async(req, res) => {
        const user = await getUserById(req.user.id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        res.json( new ApiResponse(true, 'User found', user) );
});

const updateUserHandler = asyncHandler( async(req, res) => {
        const user = await updateUser(req.user.id, req.body);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        res.json( new ApiResponse(true, 'User updated successfully', user) );
});

module.exports = {
    createUserHandler,
    getUserHandler,
    updateUserHandler
};

