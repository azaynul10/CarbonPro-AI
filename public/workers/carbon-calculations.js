/**
 * Carbon Calculation Utilities for Web Worker
 * Shared calculation functions
 */

/**
 * Emission factors database
 */
const EMISSION_FACTORS = {
  energy: {
    electric: 0.4,
    gas: 0.2,
    oil: 0.3,
    renewable: 0.05
  },
  transportation: {
    gasoline: 0.4,
    diesel: 0.35,
    hybrid: 0.25,
    electric: 0.1,
    public: 0.15
  },
  diet: {
    vegan: 1.5,
    vegetarian: 1.7,
    pescatarian: 2.3,
    mixed: 2.5,
    high_meat: 3.3
  }
};

/**
 * Regional adjustment factors
 */
const REGIONAL_FACTORS = {
  northeast: 1.12,
  southeast: 0.95,
  midwest: 1.05,
  southwest: 0.88,
  west: 0.92
};

/**
 * Calculate residential emissions
 */
function calculateResidentialEmissions(data, period) {
  const energyUsage = data.energyUsage || 0;
  const householdSize = data.householdSize || 1;
  const heatingType = data.heatingType || 'electric';
  
  const factor = EMISSION_FACTORS.energy[heatingType] || EMISSION_FACTORS.energy.electric;
  let emissions = energyUsage * factor;
  
  // Adjust for household size (economies of scale)
  emissions *= Math.sqrt(householdSize);
  
  // Period adjustment
  const periodMultipliers = { monthly: 1, quarterly: 3, yearly: 12 };
  emissions *= periodMultipliers[period] || 1;
  
  return Math.round(emissions * 100) / 100;
}

/**
 * Calculate transportation emissions
 */
function calculateTransportationEmissions(data, period) {
  const transportation = data.transportation || {};
  const vehicleType = transportation.vehicleType || 'gasoline';
  const weeklyMiles = transportation.weeklyMiles || 0;
  const annualFlightHours = transportation.annualFlightHours || 0;
  
  const vehicleFactor = EMISSION_FACTORS.transportation[vehicleType] || EMISSION_FACTORS.transportation.gasoline;
  
  // Vehicle emissions (annual)
  let emissions = weeklyMiles * vehicleFactor * 52;
  
  // Flight emissions
  const avgFlightSpeed = 500; // mph
  const flightMiles = annualFlightHours * avgFlightSpeed;
  emissions += flightMiles * 0.25; // kg CO2 per mile
  
  // Period adjustment
  const periodMultipliers = { monthly: 1/12, quarterly: 1/4, yearly: 1 };
  emissions *= periodMultipliers[period] || 1;
  
  return Math.round(emissions * 100) / 100;
}

/**
 * Calculate dietary emissions
 */
function calculateDietaryEmissions(data, period) {
  const diet = data.diet || 'mixed';
  const meatConsumption = data.meatConsumption || 'moderate';
  const localFood = data.localFood || false;
  
  const dietFactor = EMISSION_FACTORS.diet[diet] || EMISSION_FACTORS.diet.mixed;
  
  const meatMultipliers = {
    none: 0.6,
    low: 0.8,
    moderate: 1.0,
    high: 1.3
  };
  
  let dailyEmissions = dietFactor * (meatMultipliers[meatConsumption] || 1.0);
  
  // Local food reduction
  if (localFood) {
    dailyEmissions *= 0.85;
  }
  
  // Convert to period
  const daysInPeriod = { monthly: 30, quarterly: 90, yearly: 365 };
  const emissions = dailyEmissions * (daysInPeriod[period] || 30);
  
  return Math.round(emissions * 100) / 100;
}

/**
 * Apply regional and seasonal adjustments
 */
function applyAdjustments(baseEmissions, data) {
  let adjustmentFactor = 1.0;
  
  // Regional adjustment
  if (data.region) {
    const regionalFactor = REGIONAL_FACTORS[data.region.toLowerCase()] || 1.0;
    adjustmentFactor *= regionalFactor;
  }
  
  // Seasonal adjustment
  const month = new Date().getMonth();
  if (month >= 11 || month <= 2) { // Winter
    adjustmentFactor *= 1.15;
  } else if (month >= 5 && month <= 8) { // Summer
    adjustmentFactor *= 1.08;
  }
  
  // Lifestyle adjustment
  if (data.lifestyle === 'eco-conscious') {
    adjustmentFactor *= 0.85;
  } else if (data.lifestyle === 'high-consumption') {
    adjustmentFactor *= 1.25;
  }
  
  return baseEmissions * adjustmentFactor;
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidenceScore(data) {
  let score = 100;
  
  // Penalize missing data
  const requiredFields = ['energyUsage', 'transportation', 'diet', 'householdSize'];
  const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);
  score -= missingFields.length * 15;
  
  // Bonus for additional data
  const optionalFields = ['wasteGeneration', 'heatingType', 'vehicleType', 'region'];
  const providedOptional = optionalFields.filter(field => data[field] !== undefined);
  score += (providedOptional.length / optionalFields.length) * 10;
  
  return Math.max(50, Math.min(100, score));
}