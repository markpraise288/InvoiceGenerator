
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    sequenceValue: {
        type: Number,
        default: 0
    }
});

const Counter = mongoose.model('Counter', CounterSchema);

module.exports = Counter;
