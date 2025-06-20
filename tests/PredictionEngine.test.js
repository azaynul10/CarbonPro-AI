
import CarbonPredictionEngine from '../src/carbon_prediction_engine.js';

describe('CarbonPredictionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new CarbonPredictionEngine();
  });

  test('should predict carbon footprint accurately', async () => {
    const consumptionData = {
      energyUsage: 800,
      transportation: { weeklyMiles: 100, vehicleType: 'gasoline' },
      diet: 'mixed',
      householdSize: 3,
      wasteGeneration: 20,
      heatingType: 'gas'
    };

    const prediction = await engine.predictCarbonFootprint(consumptionData, 'monthly');

    expect(prediction.totalPredictedEmissions).toBeGreaterThan(0);
    expect(prediction.confidenceScore).toBeGreaterThan(0.5);
    expect(prediction.breakdown).toHaveProperty('residential');
    expect(prediction.recommendations).toBeInstanceOf(Array);
  });

  test('should validate input data correctly', () => {
    const invalidData = { energyUsage: -100 };
    const validation = engine.validateConsumptionData(invalidData);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Energy usage out of reasonable range (0-10000 kWh)');
  });

  test('should calculate future projections', async () => {
    const data = {
      energyUsage: 500,
      transportation: { weeklyMiles: 50 },
      diet: 'vegetarian',
      householdSize: 2
    };

    const prediction = await engine.predictCarbonFootprint(data, 'monthly');
    const projections = prediction.futureProjections;

    expect(projections).toHaveProperty('3months');
    expect(projections).toHaveProperty('1year');
    expect(projections['1year'].emissions).toBeGreaterThan(projections['3months'].emissions);
  });
});