import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Zap, Home, Car, Plane, BarChart3, Target, Lightbulb, Leaf, Recycle, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { dbService } from '../lib/supabase';
import { User, CarbonPrediction, PredictionAccuracy } from '../types/database';
import CarbonPredictionEngine from '../lib/carbonPredictionEngine';

interface PredictionEngineProps {
  user: User;
}

const PredictionEngine: React.FC<PredictionEngineProps> = ({ user }) => {
  const [consumptionData, setConsumptionData] = useState({
    energyUsage: '',
    householdSize: '',
    heatingType: 'electric',
    transportation: {
      weeklyMiles: '',
      vehicleType: 'gasoline',
      annualFlightHours: ''
    },
    diet: 'mixed',
    meatConsumption: 'moderate',
    localFood: false,
    wasteGeneration: '',
    recyclingHabits: 'sometimes',
    compostingHabits: false,
    renewableEnergy: '',
    energyProvider: 'grid',
    region: 'northeast',
    lifestyle: 'average'
  });
  
  const [prediction, setPrediction] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [predictionPeriod, setPredictionPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [predictions, setPredictions] = useState<CarbonPrediction[]>([]);
  const [accuracyData, setAccuracyData] = useState<PredictionAccuracy[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'results' | 'recommendations'>('form');

  useEffect(() => {
    loadPredictionHistory();
  }, [user.user_id]);

  const loadPredictionHistory = async () => {
    try {
      const [predictionsData, accuracyDataResult] = await Promise.all([
        dbService.getUserPredictions(user.user_id),
        dbService.getPredictionAccuracy(user.user_id)
      ]);
      
      setPredictions(predictionsData || []);
      setAccuracyData(accuracyDataResult || []);
    } catch (error) {
      console.error('Error loading prediction history:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setConsumptionData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setConsumptionData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const calculatePrediction = async () => {
    setIsCalculating(true);
    
    try {
      const engine = new CarbonPredictionEngine();
      
      // Prepare data for prediction engine
      const predictionData = {
        energyUsage: parseFloat(consumptionData.energyUsage) || 0,
        householdSize: parseFloat(consumptionData.householdSize) || 1,
        heatingType: consumptionData.heatingType,
        transportation: {
          weeklyMiles: parseFloat(consumptionData.transportation.weeklyMiles) || 0,
          vehicleType: consumptionData.transportation.vehicleType,
          annualFlightHours: parseFloat(consumptionData.transportation.annualFlightHours) || 0
        },
        diet: consumptionData.diet,
        meatConsumption: consumptionData.meatConsumption,
        localFood: consumptionData.localFood,
        wasteGeneration: parseFloat(consumptionData.wasteGeneration) || 20,
        recyclingHabits: consumptionData.recyclingHabits,
        compostingHabits: consumptionData.compostingHabits,
        renewableEnergy: parseFloat(consumptionData.renewableEnergy) || 0,
        energyProvider: consumptionData.energyProvider,
        region: consumptionData.region,
        lifestyle: consumptionData.lifestyle
      };

      const result = await engine.predictCarbonFootprint(predictionData, predictionPeriod);
      setPrediction(result);
      setActiveTab('results');
      
      // Save prediction to database
      await dbService.createPrediction({
        user_id: user.user_id,
        consumption_data: predictionData,
        predicted_emissions: result.totalPredictedEmissions,
        prediction_period: predictionPeriod,
        status: 'pending'
      });
      
      // Reload prediction history
      loadPredictionHistory();
      
    } catch (error) {
      console.error('Error calculating prediction:', error);
      alert('Failed to calculate prediction. Please check your input data.');
    } finally {
      setIsCalculating(false);
    }
  };

  const inputSections = [
    {
      title: 'Energy & Home',
      icon: Zap,
      color: 'yellow',
      fields: [
        {
          field: 'energyUsage',
          label: 'Monthly Energy Usage (kWh)',
          type: 'number',
          placeholder: '850'
        },
        {
          field: 'householdSize',
          label: 'Household Size',
          type: 'number',
          placeholder: '3'
        },
        {
          field: 'heatingType',
          label: 'Heating Type',
          type: 'select',
          options: [
            { value: 'electric', label: 'Electric' },
            { value: 'gas', label: 'Natural Gas' },
            { value: 'oil', label: 'Oil' },
            { value: 'renewable', label: 'Renewable' }
          ]
        },
        {
          field: 'renewableEnergy',
          label: 'Renewable Energy (%)',
          type: 'number',
          placeholder: '0'
        }
      ]
    },
    {
      title: 'Transportation',
      icon: Car,
      color: 'blue',
      fields: [
        {
          field: 'transportation.weeklyMiles',
          label: 'Weekly Driving Miles',
          type: 'number',
          placeholder: '120'
        },
        {
          field: 'transportation.vehicleType',
          label: 'Vehicle Type',
          type: 'select',
          options: [
            { value: 'gasoline', label: 'Gasoline' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'hybrid', label: 'Hybrid' },
            { value: 'electric', label: 'Electric' },
            { value: 'public', label: 'Public Transit' }
          ]
        },
        {
          field: 'transportation.annualFlightHours',
          label: 'Annual Flight Hours',
          type: 'number',
          placeholder: '10'
        }
      ]
    },
    {
      title: 'Diet & Lifestyle',
      icon: Leaf,
      color: 'green',
      fields: [
        {
          field: 'diet',
          label: 'Diet Type',
          type: 'select',
          options: [
            { value: 'vegan', label: 'Vegan' },
            { value: 'vegetarian', label: 'Vegetarian' },
            { value: 'pescatarian', label: 'Pescatarian' },
            { value: 'mixed', label: 'Mixed' },
            { value: 'high_meat', label: 'High Meat' }
          ]
        },
        {
          field: 'meatConsumption',
          label: 'Meat Consumption',
          type: 'select',
          options: [
            { value: 'none', label: 'None' },
            { value: 'low', label: 'Low' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'high', label: 'High' }
          ]
        },
        {
          field: 'localFood',
          label: 'Buy Local Food',
          type: 'checkbox'
        }
      ]
    },
    {
      title: 'Waste Management',
      icon: Recycle,
      color: 'purple',
      fields: [
        {
          field: 'wasteGeneration',
          label: 'Weekly Waste (kg)',
          type: 'number',
          placeholder: '20'
        },
        {
          field: 'recyclingHabits',
          label: 'Recycling Habits',
          type: 'select',
          options: [
            { value: 'never', label: 'Never' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'often', label: 'Often' },
            { value: 'always', label: 'Always' }
          ]
        },
        {
          field: 'compostingHabits',
          label: 'Composting',
          type: 'checkbox'
        }
      ]
    }
  ];

  // Prepare chart data for prediction accuracy
  const accuracyChartData = accuracyData.slice(0, 10).reverse().map((item, index) => ({
    name: `Prediction ${index + 1}`,
    accuracy: item.accuracy_percentage,
    predicted: item.predicted_value,
    actual: item.actual_value
  }));

  const averageAccuracy = accuracyData.length > 0 
    ? accuracyData.reduce((sum, item) => sum + item.accuracy_percentage, 0) / accuracyData.length 
    : 0;

  // Prepare breakdown chart data
  const breakdownData = prediction ? Object.entries(prediction.breakdown).map(([category, value]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: Number(value),
    color: {
      residential: '#22BFFD',
      transportation: '#00374C',
      dietary: '#22BFFD80',
      waste: '#00374C80',
      energy: '#22BFFD'
    }[category] || '#6b7280'
  })) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#F5F5F5] mb-4">AI-Powered Carbon Prediction</h1>
        <p className="text-[#F5F5F5]/70 max-w-3xl mx-auto text-lg">
          Get accurate carbon footprint predictions using advanced machine learning algorithms. 
          Track your environmental impact and make informed decisions.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{predictions.length}</div>
              <div className="text-[#22BFFD]/80">Total Predictions</div>
            </div>
            <BarChart3 className="w-10 h-10 text-[#22BFFD]/60" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/20 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{averageAccuracy.toFixed(1)}%</div>
              <div className="text-[#00374C]/80">Average Accuracy</div>
            </div>
            <Target className="w-10 h-10 text-[#00374C]/60" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{user.total_emissions.toFixed(1)}</div>
              <div className="text-[#22BFFD]/80">Current Footprint (tons)</div>
            </div>
            <TrendingUp className="w-10 h-10 text-[#22BFFD]/60" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-xl border border-[#00374C]/30 p-1 flex space-x-1">
        {[
          { id: 'form', label: 'Input Data', icon: Calculator },
          { id: 'results', label: 'Results', icon: BarChart3 },
          { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                  : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5] hover:bg-[#00374C]/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Sections */}
      {activeTab === 'form' && (
        <div className="space-y-8">
          {/* Prediction Form */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-[#F5F5F5]">Carbon Footprint Assessment</h2>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-[#F5F5F5]/80">Prediction Period:</label>
                <select
                  value={predictionPeriod}
                  onChange={(e) => setPredictionPeriod(e.target.value as any)}
                  className="px-3 py-2 bg-[#00374C]/10 border border-[#00374C]/30 rounded-lg text-[#F5F5F5] focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {inputSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-[#22BFFD]/20 border border-[#22BFFD]/30">
                        <Icon className="w-6 h-6 text-[#22BFFD]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#F5F5F5]">{section.title}</h3>
                    </div>

                    <div className="space-y-4">
                      {section.fields.map((field) => (
                        <div key={field.field}>
                          <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-2">
                            {field.label}
                          </label>
                          
                          {field.type === 'select' ? (
                            <select
                              value={field.field.includes('.') 
                                ? consumptionData[field.field.split('.')[0] as keyof typeof consumptionData][field.field.split('.')[1] as any]
                                : consumptionData[field.field as keyof typeof consumptionData]
                              }
                              onChange={(e) => handleInputChange(field.field, e.target.value)}
                              className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300"
                            >
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value} className="bg-[#0D0D0D] text-[#F5F5F5]">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={field.field.includes('.') 
                                  ? consumptionData[field.field.split('.')[0] as keyof typeof consumptionData][field.field.split('.')[1] as any]
                                  : consumptionData[field.field as keyof typeof consumptionData]
                                }
                                onChange={(e) => handleInputChange(field.field, e.target.checked)}
                                className="w-5 h-5 text-[#22BFFD] bg-[#00374C]/10 border-[#00374C]/30 rounded focus:ring-[#22BFFD]/50"
                              />
                              <span className="text-sm text-[#F5F5F5]/80">Yes</span>
                            </label>
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={field.field.includes('.') 
                                ? consumptionData[field.field.split('.')[0] as keyof typeof consumptionData][field.field.split('.')[1] as any]
                                : consumptionData[field.field as keyof typeof consumptionData]
                              }
                              onChange={(e) => handleInputChange(field.field, e.target.value)}
                              className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={calculatePrediction}
                disabled={isCalculating}
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-[#22BFFD] to-[#00374C] text-white px-10 py-4 rounded-xl font-semibold hover:from-[#22BFFD]/80 hover:to-[#00374C]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <Calculator className="w-6 h-6" />
                <span>{isCalculating ? 'Calculating Prediction...' : 'Generate AI Prediction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && prediction && (
        <div className="space-y-8">
          {/* Prediction Result */}
          <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#22BFFD]/20 rounded-full mb-6 border border-[#22BFFD]/30">
                <Brain className="w-10 h-10 text-[#22BFFD]" />
              </div>
              <h2 className="text-3xl font-bold text-[#F5F5F5] mb-4">Your Carbon Footprint Prediction</h2>
              <div className="text-5xl font-bold text-[#22BFFD] mb-4">
                {prediction.totalPredictedEmissions.toFixed(2)} tons CO₂
              </div>
              <p className="text-[#F5F5F5]/70 mb-8 text-lg">
                Predicted {predictionPeriod} carbon footprint based on your consumption patterns
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-[#0D0D0D]/40 rounded-xl p-6 border border-[#00374C]/30">
                  <div className="text-lg font-semibold text-[#F5F5F5]">Global Average</div>
                  <div className="text-3xl font-bold text-[#00374C]">4.8 tons</div>
                  <div className="text-sm text-[#F5F5F5]/60">per person/year</div>
                </div>
                <div className="bg-[#0D0D0D]/40 rounded-xl p-6 border border-[#22BFFD]/30">
                  <div className="text-lg font-semibold text-[#F5F5F5]">Your Prediction</div>
                  <div className="text-3xl font-bold text-[#22BFFD]">{prediction.totalPredictedEmissions.toFixed(1)} tons</div>
                  <div className="text-sm text-[#F5F5F5]/60">per {predictionPeriod.replace('ly', '')}</div>
                </div>
                <div className="bg-[#0D0D0D]/40 rounded-xl p-6 border border-[#00374C]/30">
                  <div className="text-lg font-semibold text-[#F5F5F5]">Paris Agreement Target</div>
                  <div className="text-3xl font-bold text-[#00374C]">2.3 tons</div>
                  <div className="text-sm text-[#F5F5F5]/60">per person/year</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Emissions Breakdown */}
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
              <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Emissions Breakdown</h3>
              {breakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toFixed(2)} tons`, 'Emissions']}
                      contentStyle={{ 
                        backgroundColor: '#0D0D0D', 
                        border: '1px solid #00374C',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-[#F5F5F5]/60">
                  No breakdown data available
                </div>
              )}
            </div>

            {/* Future Projections */}
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
              <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Future Projections</h3>
              {prediction.futureProjections && (
                <div className="space-y-4">
                  {Object.entries(prediction.futureProjections).map(([period, projection]: [string, any]) => (
                    <div key={period} className="flex items-center justify-between p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                      <div>
                        <div className="font-medium text-[#F5F5F5] capitalize">
                          {period.replace(/(\d+)/, '$1 ')}
                        </div>
                        <div className="text-sm text-[#F5F5F5]/70">
                          {(projection.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#F5F5F5]">
                          {projection.emissions.toFixed(2)} tons
                        </div>
                        <div className={`text-sm ${
                          projection.growthFactor > 1 ? 'text-red-400' : 'text-[#22BFFD]'
                        }`}>
                          {projection.growthFactor > 1 ? '+' : ''}{((projection.growthFactor - 1) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Uncertainty Range */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Prediction Confidence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-[#22BFFD]/10 rounded-xl border border-[#22BFFD]/20">
                <div className="text-2xl font-bold text-[#22BFFD]">
                  {prediction.confidenceScore.toFixed(1)}%
                </div>
                <div className="text-sm text-[#F5F5F5]/70">Confidence Score</div>
              </div>
              <div className="text-center p-6 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                <div className="text-2xl font-bold text-[#00374C]">
                  {prediction.uncertaintyRange.lower.toFixed(2)} - {prediction.uncertaintyRange.upper.toFixed(2)}
                </div>
                <div className="text-sm text-[#F5F5F5]/70">Range (tons CO₂)</div>
              </div>
              <div className="text-center p-6 bg-[#22BFFD]/10 rounded-xl border border-[#22BFFD]/20">
                <div className="text-2xl font-bold text-[#22BFFD]">
                  {prediction.metadata.dataQuality.toFixed(0)}%
                </div>
                <div className="text-sm text-[#F5F5F5]/70">Data Quality</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && prediction && (
        <div className="space-y-8">
          {/* Recommendations */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Personalized Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prediction.recommendations.map((rec: any, index: number) => (
                <div key={index} className="p-6 bg-gradient-to-r from-[#22BFFD]/10 to-[#00374C]/10 rounded-xl border border-[#22BFFD]/20">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-[#22BFFD]/20 rounded-lg border border-[#22BFFD]/30">
                      <Lightbulb className="w-5 h-5 text-[#22BFFD]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#F5F5F5] mb-2">{rec.title}</h4>
                      <p className="text-[#F5F5F5]/70 text-sm mb-3">{rec.description}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          rec.difficulty === 'easy' ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30' :
                          rec.difficulty === 'medium' ? 'bg-[#00374C]/20 text-[#00374C] border border-[#00374C]/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {rec.difficulty}
                        </span>
                        <span className="text-[#F5F5F5]/60">{rec.timeframe}</span>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <span className="font-medium text-[#22BFFD]">
                          Potential reduction: {rec.potentialReduction.toFixed(2)} tons CO₂
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prediction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Prediction Accuracy Chart */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Prediction Accuracy Trend</h3>
          {accuracyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00374C" opacity={0.3} />
                <XAxis dataKey="name" stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                <YAxis stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0D0D0D', 
                    border: '1px solid #00374C',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#22BFFD" 
                  strokeWidth={3}
                  dot={{ fill: '#22BFFD', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-[#F5F5F5]/60">
              No accuracy data available yet
            </div>
          )}
        </div>

        {/* Recent Predictions */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Recent Predictions</h3>
          <div className="space-y-4">
            {predictions.slice(0, 5).map((pred) => (
              <div key={pred.prediction_id} className="flex items-center justify-between p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                <div>
                  <div className="text-sm font-medium text-[#F5F5F5]">
                    {new Date(pred.prediction_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-[#F5F5F5]/60 capitalize">
                    {pred.prediction_period} • {pred.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#22BFFD]">
                    {pred.predicted_emissions.toFixed(2)} tons
                  </div>
                  {pred.accuracy_score && (
                    <div className="text-xs text-[#F5F5F5]/60">
                      {pred.accuracy_score.toFixed(1)}% accuracy
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionEngine;