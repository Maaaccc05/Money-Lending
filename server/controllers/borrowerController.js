import Borrower from '../models/Borrower.js';

export const createBorrower = async (req, res) => {
  try {
    const borrower = new Borrower(req.body);
    await borrower.save();

    res.status(201).json({
      message: 'Borrower created successfully',
      borrower: borrower.toObject({ hide: 'panNumber aadhaarNumber bankAccountNumber' }),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getBorrowers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const borrowers = await Borrower.find()
      .select('-panNumber -aadhaarNumber -bankAccountNumber')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Borrower.countDocuments();

    res.status(200).json({
      borrowers,
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

export const getBorrowerById = async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id).select(
      '-panNumber -aadhaarNumber -bankAccountNumber'
    );

    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    res.status(200).json(borrower);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBorrower = async (req, res) => {
  try {
    // Prevent updating sensitive fields through API
    delete req.body.panNumber;
    delete req.body.aadhaarNumber;
    delete req.body.bankAccountNumber;

    const borrower = await Borrower.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-panNumber -aadhaarNumber -bankAccountNumber');

    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    res.status(200).json({
      message: 'Borrower updated successfully',
      borrower,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchBorrowers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const borrowers = await Borrower.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { surname: new RegExp(query, 'i') },
        { bankName: new RegExp(query, 'i') },
      ],
    })
      .select('-panNumber -aadhaarNumber -bankAccountNumber')
      .limit(20);

    res.status(200).json(borrowers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  createBorrower,
  getBorrowers,
  getBorrowerById,
  updateBorrower,
  searchBorrowers,
};
