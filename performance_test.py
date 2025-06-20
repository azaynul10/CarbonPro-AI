import time
import requests
import json
import concurrent.futures
import statistics
from datetime import datetime

class PerformanceTester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.results = {
            'prediction_tests': [],
            'trading_tests': [],
            'api_tests': [],
            'load_tests': []
        }
    
    def test_prediction_performance(self, num_tests=100):
        """Test carbon prediction API performance"""
        print(f"Testing prediction performance with {num_tests} requests...")
        
        test_data = {
            "energyUsage": 800,
            "transportation": {"weeklyMiles": 100, "vehicleType": "gasoline"},
            "diet": "mixed",
            "householdSize": 3,
            "wasteGeneration": 20,
            "heatingType": "gas"
        }
        
        response_times = []
        errors = 0
        
        for i in range(num_tests):
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/api/predictions",
                    json=test_data,
                    timeout=10
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    response_times.append((end_time - start_time) * 1000)  # Convert to ms
                else:
                    errors += 1
                    
            except Exception as e:
                errors += 1
                print(f"Error in request {i}: {e}")
        
        if response_times:
            avg_time = statistics.mean(response_times)
            median_time = statistics.median(response_times)
            p95_time = sorted(response_times)[int(len(response_times) * 0.95)]
            
            self.results['prediction_tests'] = {
                'total_requests': num_tests,
                'successful_requests': len(response_times),
                'errors': errors,
                'average_response_time_ms': avg_time,
                'median_response_time_ms': median_time,
                'p95_response_time_ms': p95_time,
                'min_response_time_ms': min(response_times),
                'max_response_time_ms': max(response_times)
            }
            
            print(f"Prediction API Results:")
            print(f"  Average response time: {avg_time:.2f}ms")
            print(f"  Median response time: {median_time:.2f}ms")
            print(f"  95th percentile: {p95_time:.2f}ms")
            print(f"  Error rate: {(errors/num_tests)*100:.2f}%")
    
    def test_trading_performance(self, num_orders=50):
        """Test trading order placement performance"""
        print(f"Testing trading performance with {num_orders} orders...")
        
        response_times = []
        errors = 0
        
        for i in range(num_orders):
            order_data = {
                "orderType": "buy" if i % 2 == 0 else "sell",
                "quantity": 10 + (i % 20),
                "price": 20 + (i % 10),
                "creditId": "test-credit-id"
            }
            
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/api/orders",
                    json=order_data,
                    timeout=10
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    response_times.append((end_time - start_time) * 1000)
                else:
                    errors += 1
                    
            except Exception as e:
                errors += 1
                print(f"Error in order {i}: {e}")
        
        if response_times:
            avg_time = statistics.mean(response_times)
            
            self.results['trading_tests'] = {
                'total_orders': num_orders,
                'successful_orders': len(response_times),
                'errors': errors,
                'average_response_time_ms': avg_time,
                'orders_per_second': len(response_times) / (sum(response_times) / 1000)
            }
            
            print(f"Trading API Results:")
            print(f"  Average response time: {avg_time:.2f}ms")
            print(f"  Orders per second: {self.results['trading_tests']['orders_per_second']:.2f}")
            print(f"  Error rate: {(errors/num_orders)*100:.2f}%")
    
    def test_concurrent_load(self, concurrent_users=20, requests_per_user=10):
        """Test system under concurrent load"""
        print(f"Testing concurrent load: {concurrent_users} users, {requests_per_user} requests each...")
        
        def make_requests(user_id):
            user_results = []
            for i in range(requests_per_user):
                start_time = time.time()
                try:
                    # Alternate between different API endpoints
                    if i % 3 == 0:
                        # Prediction request
                        response = requests.post(
                            f"{self.base_url}/api/predictions",
                            json={
                                "energyUsage": 700 + (user_id * 10),
                                "transportation": {"weeklyMiles": 80 + (user_id * 5)},
                                "diet": "mixed",
                                "householdSize": 2 + (user_id % 3)
                            },
                            timeout=15
                        )
                    elif i % 3 == 1:
                        # Market data request
                        response = requests.get(
                            f"{self.base_url}/api/market-data",
                            timeout=15
                        )
                    else:
                        # Order placement
                        response = requests.post(
                            f"{self.base_url}/api/orders",
                            json={
                                "orderType": "buy",
                                "quantity": 5 + (user_id % 10),
                                "price": 25 + (user_id % 5),
                                "creditId": f"credit-{user_id}"
                            },
                            timeout=15
                        )
                    
                    end_time = time.time()
                    user_results.append({
                        'response_time': (end_time - start_time) * 1000,
                        'status_code': response.status_code,
                        'success': response.status_code == 200
                    })
                    
                except Exception as e:
                    user_results.append({
                        'response_time': None,
                        'status_code': None,
                        'success': False,
                        'error': str(e)
                    })
            
            return user_results
        
        # Execute concurrent requests
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_requests, user_id) for user_id in range(concurrent_users)]
            all_results = []
            
            for future in concurrent.futures.as_completed(futures):
                all_results.extend(future.result())
        
        end_time = time.time()
        
        # Analyze results
        successful_requests = [r for r in all_results if r['success']]
        failed_requests = [r for r in all_results if not r['success']]
        response_times = [r['response_time'] for r in successful_requests if r['response_time']]
        
        if response_times:
            self.results['load_tests'] = {
                'concurrent_users': concurrent_users,
                'total_requests': len(all_results),
                'successful_requests': len(successful_requests),
                'failed_requests': len(failed_requests),
                'total_duration_seconds': end_time - start_time,
                'requests_per_second': len(all_results) / (end_time - start_time),
                'average_response_time_ms': statistics.mean(response_times),
                'median_response_time_ms': statistics.median(response_times),
                'p95_response_time_ms': sorted(response_times)[int(len(response_times) * 0.95)],
                'error_rate_percent': (len(failed_requests) / len(all_results)) * 100
            }
            
            print(f"Load Test Results:")
            print(f"  Total requests: {len(all_results)}")
            print(f"  Requests per second: {self.results['load_tests']['requests_per_second']:.2f}")
            print(f"  Average response time: {self.results['load_tests']['average_response_time_ms']:.2f}ms")
            print(f"  95th percentile: {self.results['load_tests']['p95_response_time_ms']:.2f}ms")
            print(f"  Error rate: {self.results['load_tests']['error_rate_percent']:.2f}%")
    
    def test_api_endpoints(self):
        """Test all API endpoints for basic functionality"""
        print("Testing API endpoints...")
        
        endpoints = [
            {'method': 'GET', 'path': '/health', 'expected_status': 200},
            {'method': 'GET', 'path': '/api/market-data', 'expected_status': 200},
            {'method': 'GET', 'path': '/api/carbon-credits', 'expected_status': 200},
        ]
        
        results = []
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                if endpoint['method'] == 'GET':
                    response = requests.get(f"{self.base_url}{endpoint['path']}", timeout=10)
                else:
                    response = requests.post(f"{self.base_url}{endpoint['path']}", timeout=10)
                
                end_time = time.time()
                
                results.append({
                    'endpoint': endpoint['path'],
                    'method': endpoint['method'],
                    'status_code': response.status_code,
                    'response_time_ms': (end_time - start_time) * 1000,
                    'success': response.status_code == endpoint['expected_status']
                })
                
            except Exception as e:
                results.append({
                    'endpoint': endpoint['path'],
                    'method': endpoint['method'],
                    'status_code': None,
                    'response_time_ms': None,
                    'success': False,
                    'error': str(e)
                })
        
        self.results['api_tests'] = results
        
        print("API Endpoint Results:")
        for result in results:
            status = "✓" if result['success'] else "✗"
            print(f"  {status} {result['method']} {result['endpoint']}: {result.get('status_code', 'ERROR')}")
    
    def run_all_tests(self):
        """Run complete performance test suite"""
        print("=" * 60)
        print("Carbon Footprint Marketplace Performance Tests")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Run all test suites
        self.test_api_endpoints()
        print()
        self.test_prediction_performance(100)
        print()
        self.test_trading_performance(50)
        print()
        self.test_concurrent_load(20, 10)
        print()
        
        # Generate summary report
        self.generate_report()
    
    def generate_report(self):
        """Generate comprehensive performance report"""
        print("=" * 60)
        print("PERFORMANCE TEST SUMMARY")
        print("=" * 60)
        
        # API Health Check
        api_results = self.results.get('api_tests', [])
        healthy_endpoints = sum(1 for r in api_results if r['success'])
        print(f"API Health: {healthy_endpoints}/{len(api_results)} endpoints healthy")
        
        # Prediction Performance
        pred_results = self.results.get('prediction_tests', {})
        if pred_results:
            print(f"Prediction API: {pred_results['average_response_time_ms']:.2f}ms avg response")
            print(f"  Success rate: {(pred_results['successful_requests']/pred_results['total_requests'])*100:.1f}%")
        
        # Trading Performance
        trade_results = self.results.get('trading_tests', {})
        if trade_results:
            print(f"Trading API: {trade_results['average_response_time_ms']:.2f}ms avg response")
            print(f"  Throughput: {trade_results['orders_per_second']:.2f} orders/sec")
        
        # Load Test Results
        load_results = self.results.get('load_tests', {})
        if load_results:
            print(f"Load Test: {load_results['requests_per_second']:.2f} req/sec")
            print(f"  Error rate: {load_results['error_rate_percent']:.2f}%")
            print(f"  95th percentile: {load_results['p95_response_time_ms']:.2f}ms")
        
        # Performance Recommendations
        print("\nRECOMMENDations:")
        self.generate_recommendations()
        
        # Save detailed results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"performance_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'results': self.results
            }, f, indent=2)
        
        print(f"\nDetailed results saved to: {filename}")
    
    def generate_recommendations(self):
        """Generate performance improvement recommendations"""
        recommendations = []
        
        # Check prediction performance
        pred_results = self.results.get('prediction_tests', {})
        if pred_results and pred_results.get('average_response_time_ms', 0) > 500:
            recommendations.append("• Prediction API is slow (>500ms) - consider caching or optimization")
        
        # Check trading performance
        trade_results = self.results.get('trading_tests', {})
        if trade_results and trade_results.get('orders_per_second', 0) < 10:
            recommendations.append("• Trading throughput is low (<10 orders/sec) - optimize order processing")
        
        # Check load test results
        load_results = self.results.get('load_tests', {})
        if load_results:
            if load_results.get('error_rate_percent', 0) > 5:
                recommendations.append("• High error rate under load (>5%) - improve error handling")
            
            if load_results.get('p95_response_time_ms', 0) > 2000:
                recommendations.append("• High 95th percentile response time (>2s) - optimize slow queries")
        
        # API health check
        api_results = self.results.get('api_tests', [])
        failed_apis = [r for r in api_results if not r['success']]
        if failed_apis:
            recommendations.append(f"• {len(failed_apis)} API endpoints failing - check service health")
        
        if not recommendations:
            recommendations.append("• All performance metrics look good!")
        
        for rec in recommendations:
            print(rec)

if __name__ == "__main__":
    # Run performance tests
    tester = PerformanceTester()
    tester.run_all_tests()