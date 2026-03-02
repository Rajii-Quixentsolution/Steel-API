var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var BuildingSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  areaId: { type: Number, required: true },
  locId: { type: Number, required: true },
  srNo: { type: Number, required: true },
  gmap: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  sqfeet: { type: Number, required: true },
  nl: { type: Number, required: true },
  nh: { type: Number, required: true },
  shop: { type: Number, required: true },
  white: { type: Number, required: true },
  remarks: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdAt: Date,
  updateAt: Date,
});

const Buildings = mongoose.model("buildings", BuildingSchema);
Buildings.createIndexes();
module.exports = Buildings;
