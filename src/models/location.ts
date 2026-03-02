var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var LocationSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  areaId: { type: Number, required: true },
  name: { type: String, unique: true, required: true },
  createdAt: Date,
  updateAt: Date,
});

const Locations = mongoose.model("locations", LocationSchema);
Locations.createIndexes();
module.exports = Locations;
