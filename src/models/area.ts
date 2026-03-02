var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var AreaSchema = new Schema({
  id: { type: Number, unique: true, required: true, index: true },
  name: { type: String, unique: true, required: true, index: true },
  createdAt: Date,
  updatedAt: Date,
});

const Areas = mongoose.model("areas", AreaSchema);
Areas.createIndexes();
module.exports = Areas;
