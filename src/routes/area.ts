import express, { Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole } from "../models/User";

// Import models
const Areas = require("../models/area");
const Locations = require("../models/location");
const Buildings = require("../models/building");

const router = express.Router();

// ============================================
// AREA MANAGEMENT (Super Admin Only)
// ============================================

// Create a new Area
router.post("/area", async (req: Request, res: Response) => {
  try {
    const { adminId, name } = req.body;

    // Validate admin
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can create areas" });
    }

    if (!name) {
      return res.status(400).json({ error: "Area name is required" });
    }

    // Get max id
    const maxArea = await Areas.findOne().sort({ id: -1 });
    const newId = maxArea ? maxArea.id + 1 : 1;

    const newArea = new Areas({
      id: newId,
      name: name.trim()
    });

    await newArea.save();

    res.json({
      success: true,
      message: `Area "${name}" created successfully`,
      area: {
        id: newArea.id,
        name: newArea.name
      }
    });
  } catch (error: any) {
    console.error("Create area error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Areas
router.get("/areas", async (req: Request, res: Response) => {
  try {
    const areas = await Areas.find().sort({ name: 1 });
    res.json({
      success: true,
      areas: areas
    });
  } catch (error: any) {
    console.error("Get areas error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOCATION MANAGEMENT (Super Admin Only)
// ============================================

// Create a new Location (linked to Area)
router.post("/location", async (req: Request, res: Response) => {
  try {
    const { adminId, areaId, name } = req.body;

    // Validate admin
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can create locations" });
    }

    if (!areaId || !name) {
      return res.status(400).json({ error: "areaId and name are required" });
    }

    // Check if area exists
    const area = await Areas.findOne({ id: Number(areaId) });
    if (!area) {
      return res.status(404).json({ error: "Area not found" });
    }

    // Get max id
    const maxLocation = await Locations.findOne().sort({ id: -1 });
    const newId = maxLocation ? maxLocation.id + 1 : 1;

    const newLocation = new Locations({
      id: newId,
      areaId: Number(areaId),
      name: name.trim()
    });

    await newLocation.save();

    res.json({
      success: true,
      message: `Location "${name}" created successfully`,
      location: {
        id: newLocation.id,
        areaId: newLocation.areaId,
        name: newLocation.name
      }
    });
  } catch (error: any) {
    console.error("Create location error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Locations (optionally filter by areaId)
router.get("/locations", async (req: Request, res: Response) => {
  try {
    const { areaId } = req.query;
    
    const query: any = {};
    if (areaId) {
      query.areaId = Number(areaId);
    }

    const locations = await Locations.find(query).sort({ name: 1 });
    res.json({
      success: true,
      locations: locations
    });
  } catch (error: any) {
    console.error("Get locations error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BUILDING MANAGEMENT (Super Admin Only)
// ============================================

// Create a new Building (linked to Area + Location)
router.post("/building", async (req: Request, res: Response) => {
  try {
    const { 
      adminId, 
      areaId, 
      locId, 
      srNo, 
      gmap, 
      name, 
      code, 
      width, 
      height, 
      sqfeet, 
      nl, 
      nh, 
      shop, 
      white, 
      remarks,
      startDate,
      endDate
    } = req.body;

    // Validate admin
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can create buildings" });
    }

    // Required fields
    if (!areaId || !locId || !name || !code) {
      return res.status(400).json({ error: "areaId, locId, name, and code are required" });
    }

    // Check if area exists
    const area = await Areas.findOne({ id: Number(areaId) });
    if (!area) {
      return res.status(404).json({ error: "Area not found" });
    }

    // Check if location exists and belongs to area
    const location = await Locations.findOne({ id: Number(locId), areaId: Number(areaId) });
    if (!location) {
      return res.status(404).json({ error: "Location not found or does not belong to this area" });
    }

    // Get max id
    const maxBuilding = await Buildings.findOne().sort({ id: -1 });
    const newId = maxBuilding ? maxBuilding.id + 1 : 1;

    const newBuilding = new Buildings({
      id: newId,
      areaId: Number(areaId),
      locId: Number(locId),
      srNo: srNo || 1,
gmap: gmap || "-",
      name: name.trim(),
      code: code.trim(),
      width: width || 0,
      height: height || 0,
      sqfeet: sqfeet || 0,
      nl: nl || 0,
      nh: nh || 0,
      shop: shop || 0,
      white: white || 0,
remarks: remarks || "-",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default 1 year
    });

    await newBuilding.save();

    res.json({
      success: true,
      message: `Building "${name}" created successfully`,
      building: {
        id: newBuilding.id,
        areaId: newBuilding.areaId,
        locId: newBuilding.locId,
        name: newBuilding.name,
        code: newBuilding.code
      }
    });
  } catch (error: any) {
    console.error("Create building error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Buildings (optionally filter by areaId and/or locId)
router.get("/buildings", async (req: Request, res: Response) => {
  try {
    const { areaId, locId } = req.query;
    
    const query: any = {};
    if (areaId) {
      query.areaId = Number(areaId);
    }
    if (locId) {
      query.locId = Number(locId);
    }

    const buildings = await Buildings.find(query).sort({ name: 1 });
    res.json({
      success: true,
      buildings: buildings
    });
  } catch (error: any) {
    console.error("Get buildings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get building by ID
router.get("/building/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const building = await Buildings.findOne({ id: Number(id) });
    
    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }

    // Get area and location names
    const area = await Areas.findOne({ id: building.areaId });
    const location = await Locations.findOne({ id: building.locId });

    res.json({
      success: true,
      building: {
        ...building.toObject(),
        areaName: area ? area.name : null,
        locationName: location ? location.name : null
      }
    });
  } catch (error: any) {
    console.error("Get building error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET FULL HIERARCHY
// ============================================

router.get("/hierarchy", async (req: Request, res: Response) => {
  try {
    const areas = await Areas.find().sort({ name: 1 });
    
    const hierarchy = await Promise.all(
      areas.map(async (area: any) => {
        const locations = await Locations.find({ areaId: area.id }).sort({ name: 1 });
        
        const locationsWithBuildings = await Promise.all(
          locations.map(async (location: any) => {
            const buildings = await Buildings.find({ 
              areaId: area.id, 
              locId: location.id 
            }).sort({ name: 1 });
            
            return {
              ...location.toObject(),
              buildings: buildings
            };
          })
        );

        return {
          ...area.toObject(),
          locations: locationsWithBuildings
        };
      })
    );

    res.json({
      success: true,
      hierarchy: hierarchy
    });
  } catch (error: any) {
    console.error("Get hierarchy error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
