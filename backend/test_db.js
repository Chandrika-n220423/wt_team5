const mongoose = require('mongoose');
const User = require('./models/User'); // Path to user model

mongoose.connect('mongodb://127.0.0.1:27017/nexusBank', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    const users = await User.find({}, 'email name');
    console.log("USERS:", users);
    mongoose.connection.close();
}).catch(err => console.error(err));
