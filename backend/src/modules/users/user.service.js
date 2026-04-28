
const User = require('./user.model');

const createUser = async (userData) => {
    const user = await User.create(userData);
    if (!user) {
        throw new Error('User creation failed');
    }
    return user;
}

const getUserById = async (id) => {
    const user = await User.findOne({ _id: id });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

const updateUser = async (id, updateData) => {
    const user = await User.findOneAndUpdate({ _id: id }, updateData, { returnDocument: 'after' });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

module.exports = {
    createUser,
    getUserById,
    updateUser
};
