import Lender from '../models/Lender.js';
import Loan from '../models/Loan.js';

export const createLender = async (req, res) => {
  try {
    const lender = new Lender(req.body);
    await lender.save();

    res.status(201).json({
      message: 'Lender created successfully',
      lender: lender.toObject({ hide: 'panNumber aadhaarNumber bankAccountNumber' }),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getLenders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const lenders = await Lender.find()
      .select('-panNumber -aadhaarNumber -bankAccountNumber')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Lender.countDocuments();

    res.status(200).json({
      lenders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLenderById = async (req, res) => {
  try {
    const lender = await Lender.findById(req.params.id).select(
      '-panNumber -aadhaarNumber -bankAccountNumber'
    );

    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }

    res.status(200).json(lender);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLender = async (req, res) => {
  try {
    const lender = await Lender.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-panNumber -aadhaarNumber -bankAccountNumber');

    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }

    res.status(200).json({
      message: 'Lender updated successfully',
      lender,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: error.message });
  }
};

export const searchLenders = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const lenders = await Lender.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { surname: new RegExp(query, 'i') },
        { familyGroup: new RegExp(query, 'i') },
        { bankName: new RegExp(query, 'i') },
      ],
    })
      .select('-panNumber -aadhaarNumber -bankAccountNumber')
      .limit(20);

    res.status(200).json(lenders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLendersByFamilyGroup = async (req, res) => {
  try {
    const { familyGroup } = req.query;

    if (!familyGroup) {
      return res.status(400).json({ message: 'Family group is required' });
    }

    const lenders = await Lender.find({ familyGroup: new RegExp(familyGroup, 'i') }).select(
      '-panNumber -aadhaarNumber -bankAccountNumber'
    );

    res.status(200).json(lenders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLender = async (req, res) => {
  try {
    const { id } = req.params;

    const lender = await Lender.findById(id).select('_id');
    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }

    const hasActiveContributions = await Loan.exists({
      lenders: {
        $elemMatch: {
          lenderId: id,
          status: { $ne: 'closed' },
        },
      },
    });

    if (hasActiveContributions) {
      return res.status(400).json({ message: 'Cannot delete lender with active loan contributions' });
    }

    await Lender.deleteOne({ _id: id });
    return res.status(200).json({ message: 'Lender deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default {
  createLender,
  getLenders,
  getLenderById,
  updateLender,
  searchLenders,
  getLendersByFamilyGroup,
  deleteLender,
};
