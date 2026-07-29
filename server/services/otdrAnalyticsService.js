const OtdrReport = require('../models/OtdrReport');
const Location = require('../models/Location');

/**
 * Calculates OTDR Dashboard statistics with precise RBAC scope filtering.
 * @param {Object} user - Logged in user object from req.user
 */
async function getOtdrDashboardStats(user) {
  const role = (user?.role || '').toLowerCase();
  const userDivision = user?.division ? user.division.trim() : '';
  const isGlobalAdmin = role === 'global_admin' || (role === 'admin' && !userDivision);

  // 1. Build RBAC match stage
  let reportMatchStage = {};
  let locationMatch = {};

  if (isGlobalAdmin || (!userDivision && (role === 'sub_admin' || role === 'admin'))) {
    // Global Admin / Sub Admin with organization-wide access: view ALL divisions
    reportMatchStage = {};
    locationMatch = {};
  } else if (userDivision) {
    // Division User / Division Admin / Sub Admin assigned to a specific division
    const divRegex = { $regex: new RegExp(`^${userDivision.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    reportMatchStage = { division: divRegex };
    locationMatch = { division: divRegex };
  } else {
    // User with no division: match user ownership
    const conditions = [];
    if (user?._id) conditions.push({ userId: user._id });
    if (user?.name) {
      conditions.push({ userName: user.name });
      conditions.push({ technicianName: user.name });
    }
    if (user?.email) conditions.push({ userName: user.email });
    if (user?.username) conditions.push({ userName: user.username });
    reportMatchStage = conditions.length > 0 ? { $or: conditions } : {};
  }

  // 2. Fibre Health Aggregation Pipeline
  const fibreHealthPipeline = [
    { $match: reportMatchStage },
    { $unwind: '$fibreReadings' },
    {
      $project: {
        lossValue: {
          $convert: {
            input: '$fibreReadings.dbKm',
            to: 'double',
            onError: null,
            onNull: null
          }
        }
      }
    },
    {
      $match: { lossValue: { $ne: null } }
    },
    {
      $group: {
        _id: null,
        excellent: {
          $sum: { $cond: [{ $lt: ['$lossValue', 0.40] }, 1, 0] }
        },
        good: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$lossValue', 0.40] },
                  { $lte: ['$lossValue', 0.80] }
                ]
              },
              1,
              0
            ]
          }
        },
        critical: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$lossValue', 0.80] },
                  { $lte: ['$lossValue', 1.00] }
                ]
              },
              1,
              0
            ]
          }
        },
        superCritical: {
          $sum: { $cond: [{ $gt: ['$lossValue', 1.00] }, 1, 0] }
        }
      }
    }
  ];

  // 3. Total Test Records Count
  const totalTestRecordsPromise = OtdrReport.countDocuments(reportMatchStage);

  // 4. Covered Sections Calculation (Distinct routes tested in OTDR reports)
  const coveredSectionsPipeline = [
    { $match: reportMatchStage },
    {
      $project: {
        routeKey: {
          $concat: ['$fromStation', ' - ', '$toStation']
        }
      }
    },
    {
      $group: {
        _id: '$routeKey'
      }
    },
    {
      $count: 'count'
    }
  ];

  const [
    fibreHealthResult,
    totalTestRecords,
    coveredSectionsResult,
    distinctMasterSections
  ] = await Promise.all([
    OtdrReport.aggregate(fibreHealthPipeline),
    totalTestRecordsPromise,
    OtdrReport.aggregate(coveredSectionsPipeline),
    Location.distinct('section', locationMatch)
  ]);

  const fibreHealth = fibreHealthResult[0] || {
    excellent: 0,
    good: 0,
    critical: 0,
    superCritical: 0
  };

  const coveredSections = coveredSectionsResult[0]?.count || 0;
  
  // Total master sections from Location model, fallback to coveredSections or distinct routes
  let totalSections = Array.isArray(distinctMasterSections) ? distinctMasterSections.length : 0;
  if (totalSections === 0) {
    const allRoutesCount = await OtdrReport.distinct('fromStation', reportMatchStage);
    totalSections = Math.max(allRoutesCount.length, coveredSections, 10);
  }

  return {
    fibreHealth: {
      excellent: fibreHealth.excellent || 0,
      good: fibreHealth.good || 0,
      critical: fibreHealth.critical || 0,
      superCritical: fibreHealth.superCritical || 0
    },
    totalTestRecords: totalTestRecords || 0,
    sectionsCovered: {
      covered: coveredSections || 0,
      total: totalSections || 0
    }
  };
}

module.exports = {
  getOtdrDashboardStats
};
