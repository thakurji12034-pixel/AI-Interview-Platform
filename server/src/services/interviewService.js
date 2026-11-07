const { Op } = require('sequelize');
const { Interview } = require('../models');

const ACTIVE = ['scheduled', 'in_progress'];

/**
 * State machine definition for valid interview status transitions.
 */
const TRANSITIONS = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

const addMinutes = (date, minutes) =>
  new Date(new Date(date).getTime() + minutes * 60000);

/**
 * Checks for overlapping interview slots.
 * Two time ranges overlap if: existing.start < new.end AND existing.end > new.start
 */
async function findClash({ userIds, start, end, excludeId }) {
  const where = {
    status: { [Op.in]: ACTIVE },
    scheduledAt: { [Op.lt]: end },
    endAt: { [Op.gt]: start },
    [Op.or]: [
      { interviewerId: { [Op.in]: userIds } },
      { candidateId: { [Op.in]: userIds } },
    ],
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Interview.findOne({ where });
}

module.exports = { TRANSITIONS, addMinutes, findClash };
