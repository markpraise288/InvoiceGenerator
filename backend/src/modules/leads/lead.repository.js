const Lead = require("./lead.model");


// ===============================
// CREATE LEAD
// ===============================
const createLead = async (data) => {
  return await Lead.create(data);
};


// ===============================
// GET ALL LEADS
// ===============================
const getLeads = async (query = {}) => {
  const leads = await Lead.find(query)
    .sort({ createdAt: -1 });
  return leads;
};


// ===============================
// GET SINGLE LEAD
// ===============================
const getLeadById = async (id) => {
  return await Lead.findById(id);
};


// ===============================
// UPDATE LEAD
// ===============================
const updateLead = async (id, data) => {
  return await Lead.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};


// ===============================
// ARCHIVE LEAD
// ===============================
// We don't delete CRM data permanently
// because sales history matters

const archiveLead = async (id) => {
  return await Lead.findByIdAndUpdate(
    id,
    {
      isArchived: true,
    },
    {
      new: true,
    }
  );
};


// ===============================
// SEARCH LEADS
// ===============================

const searchLeads = async (keyword) => {

  return await Lead.find({
    $or: [
      {
        name:{
          $regex: keyword,
          $options:"i"
        }
      },
      {
        email:{
          $regex: keyword,
          $options:"i"
        }
      },
      {
        company:{
          $regex: keyword,
          $options:"i"
        }
      }
    ]
  });

};


module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  archiveLead,
  searchLeads,
};