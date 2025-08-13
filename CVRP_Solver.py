#------------------------------------------------------------------------------
#
#            (c) Copyright 2025 by QUANFLUENCE PRIVATE LIMITED
#                          All rights reserved.
#
#   Trade Secret of QUANFLUENCE PRIVATE LIMITED  Do not disclose.
#
#   Use of this file in any form or means is permitted only
#   with a valid, written license agreement with QUANFLUENCE PRIVATE LIMTED.
#   The licensee shall strictly limit use of information contained herein
#   to the conditions specified in the written license agreement.
#
#   Licensee shall keep all information contained herein confidential
#   and shall protect same in whole or in part from disclosure and
#   dissemination to all third parties.
#
#                         QUANFLUENCE PRIVATE LIMITED
#                        E-Mail: assist@quanfluence.com
#                             www.quanfluence.com
#
# -----------------------------------------------------------------------------
#  File:   CVRP_Solver.py
#  Author: Rishi Mittal
#
#  Description: Solves CVRP using Quanfluence Server
#------------------------------------------------------------------------------

from CVRP_Clustering_V4 import CVRPSweepCluster, CVRPParser, generate_distance_matrix
from typing import List, Dict, Tuple, Callable, Union, Optional
import time 
from dimod import BinaryQuadraticModel
import numpy as np

def create_tsp_bqm(distances, multiplier = 1):
    """Create a BQM for TSP with the given distance matrix"""
    n = len(distances)
    lagrange = np.mean(distances)
    bqm = BinaryQuadraticModel('BINARY')
    
    # Create numeric variable keys
    def var_key(i, t):
        return i * n + t
    
    # Add variables
    for i in range(n):
        for t in range(n):
            bqm.add_variable(var_key(i, t), 0.0)

    
    # Constraint: Each city is visited exactly once (implemented manually)
    lagrange_city = multiplier*lagrange
    for i in range(n):
        # Add quadratic terms for pairs of variables
        for t1 in range(n):
            # Add linear term (penalty for not visiting city)
            bqm.add_variable(var_key(i, t1), -2.0 * lagrange_city) 
            
            for t2 in range(t1+1, n):
                # Add quadratic term (penalty for visiting city more than once)
                bqm.add_interaction(var_key(i, t1), var_key(i, t2), 2.0 * lagrange_city)
                
        # Add constant term (constraint constant)
        bqm.offset += lagrange_city
    
    # Constraint: At each time step, exactly one city is visited (implemented manually)
    lagrange_time = multiplier*lagrange
    for t in range(n):
        # Add quadratic terms for pairs of variables
        for i1 in range(n):
            # Add linear term (penalty for not visiting any city at time t)
            bqm.add_variable(var_key(i1, t), -2.0 * lagrange_time)
            
            for i2 in range(i1+1, n):
                # Add quadratic term (penalty for visiting multiple cities at same time)
                bqm.add_interaction(var_key(i1, t), var_key(i2, t), 2.0 * lagrange_time)
                
        # Add constant term (constraint constant)
        bqm.offset += lagrange_time
    
    # Objective: Minimize total distance
    for i in range(n):
        for j in range(n):
            if i != j:
                # Consecutive cities
                for t in range(n-1):
                    bqm.add_interaction(var_key(i, t), var_key(j, (t+1) % n), distances[i, j])
                # Connect last city to first
                bqm.add_interaction(var_key(i, n-1), var_key(j, 0), distances[i, j])
    
    return bqm

def decode_solution(solution, n_cities):
    """
    Decode binary solution back to TSP tour.
    
    Parameters:
    solution (np.array): Binary solution vector
    n_cities (int): Number of cities
    
    Returns:
    list: Tour as sequence of city indices
    """
    tour = [-1] * n_cities
    solution_matrix = solution.reshape(n_cities, n_cities)
    
    for t in range(n_cities):
        for i in range(n_cities):
            if solution_matrix[i][t] == 1:
                tour[t] = i
                break
    
    return tour

def calculate_tour_validity(tour, distances):
    """
    Calculate the validity and accuracy of the tour.
    
    Parameters:
    tour (list): The tour as a list of city indices
    distances (np.array): Distance matrix
    
    Returns:
    dict: Dictionary containing validity metrics
    """
    n_cities = len(distances)
    metrics = {
        "is_valid": True,
        "issues": [],
        "total_distance": 0,
        "visits_all_cities": True,
        "starts_at_zero": True,
    }
    
    # Check if tour starts at city 0
    if tour[0] != 0:
        metrics["is_valid"] = False
        metrics["starts_at_zero"] = False
        metrics["issues"].append("Tour doesn't start at city 0")
    
    # Check if all cities are visited exactly once
    if len(set(tour)) != n_cities:
        metrics["is_valid"] = False
        metrics["visits_all_cities"] = False
        metrics["issues"].append("Not all cities are visited exactly once")
    
    # Calculate total distance
    total_distance = 0
    for i in range(n_cities-1):
        from_city = tour[i]
        to_city = tour[i + 1]
        total_distance += distances[from_city][to_city]
    metrics["total_distance"] = total_distance

    return metrics

def dict_to_numpy(dictionary, size=None):
    """
    Convert a dictionary to a numpy array where dictionary keys are indices.
    
    Args:
        dictionary: Dictionary with indices as keys and values to be placed in array
        size: Optional size of array. If None, determined from max key value.
    
    Returns:
        numpy.ndarray: Array with values from dictionary
    """
    if size is None:
        size = max(int(dictionary.keys())) + 1
        
    arr = np.zeros(size)
    for idx, value in dictionary.items():
        arr[int(idx)] = value
    return arr

def print_solution(path: Optional[List[int]], length: float) -> None:
    """
    Print the solution in a formatted way.
    
    Args:
        path: List of city indices or None if invalid
        length: Total path length or inf if invalid
    """
    if path is None:
        print("\nINVALID SOLUTION")
        print("No valid route found. The problem might be infeasible or need more samples.")
    else:
        print("\nVALID SOLUTION FOUND:")
        print(f"Optimal path: {path}")
        print(f"Path length: {length}")
        print("\nRoute sequence:")
        route = " -> ".join(str(city) for city in path)
        print(route)

def calculate_tour_length(tour, distances):
    """Calculate the total length of a tour"""
    n = len(tour)
    length = 0
    for i in range(n):
        length += distances[tour[i], tour[(i+1) % n]]
    return length

def run_Solver(distances, multiplier, nodes=None):
    """
    Run the solver on a distance matrix and return the optimized tour.
    
    Parameters:
    -----------
    distances : numpy.ndarray
        Distance matrix for the TSP
    multiplier : int
        Multiplier for the BQM parameters
    nodes : list, optional
        List of actual node IDs corresponding to the indices in distances matrix.
        If provided, the returned path will be mapped to these node IDs.
        
    Returns:
    --------
    tour : list
        Optimized tour as a list of indices or node IDs (if nodes is provided)
    length : float
        Total length of the optimized tour
    """
    fact = 1 
    bqm = create_tsp_bqm(distances/fact, multiplier=multiplier)
    # print(bqm)
    Q, offset = bqm.to_qubo()

    #******* Running on Quanfluence Server *********
    from quanfluence_sdk import QuanfluenceClient

    client = QuanfluenceClient()
    try:
        client.signin('pranatree_user0', 'Pranatree@123')  #To be updated, please request for login credentials from quanfluence
        device_id = 18                        # Please Request from quanfluence or setup with API calls 
        device = client.update_device(device_id,{'description':'001'})
        result = client.execute_device_qubo_input(device_id, Q)
    except Exception:
        print("Please use appropriate login credentials")
    
    print(f'Result:{result}')
    spin_opt, energy_opt = result['result'], result['energy'] + offset 
    #************************************************************
    spin_opt = dict_to_numpy(spin_opt, size=len(distances)**2)  
    solution_array = (1+spin_opt)/2
    
    # Decode the solution to get the tour (indices)
    tour_indices = decode_solution(solution_array, len(distances))
    
    # Calculate tour length
    length = calculate_tour_length(tour_indices, distances)
    
    # If nodes mapping is provided, map the tour indices to actual node IDs
    if nodes is not None:
        # Map indices to node IDs
        tour = [nodes[idx] for idx in tour_indices]
        print(f"Solver indices: {tour_indices}")
        print(f"Mapped to node IDs: {tour}")
        return tour, length
    else:
        return tour_indices, length

def CVRP_Solver(file_path: str, output_file_path: str = "CVRP_solution.txt"):
    """
    Solve the CVRP problem using solver and write the results to a text file.
    
    Parameters:
    -----------
    file_path : str
        Path to the CVRP problem file
    output_file_path : str, optional
        Path to the output file where results will be stored
        
    Returns:
    --------
    None, prints results to console and writes solution to file
    """
    with open(file_path, 'r') as file:
        file_content = file.read()

    start_time_total = time.time()
    start_time_clustering = time.time()
    coordinates, demands, capacity, num_nodes, num_vehicles = CVRPParser.parse_file(file_content)
    
    # Print problem information
    print(f"\nProblem Information:")
    print(f"Number of nodes: {num_nodes}")
    print(f"Number of vehicles: {num_vehicles}")
    print(f"Vehicle capacity: {capacity}")
    
    # Create clustering object
    clusterer = CVRPSweepCluster(coordinates, demands, capacity, num_vehicles)
    
    # Create clusters
    clusters, cluster_demands = clusterer.create_clusters()
    end_time_clustering = time.time()
    Total_distance = 0
    
    # Print cluster information
    print("\nClustering Solution:")
    
    # Store all cluster solutions for writing to file
    all_clusters_data = []
    
    j = 0 
    for cluster in clusters:
        j+= 1
        print(f"\nCluster {j}:")
        # Include depot as first node
        cluster = sorted(cluster)
        nodes = [1] + cluster
        print(f"Cluster nodes: {nodes}")
        
        distances = generate_distance_matrix(coordinates, nodes)
        # print(distances)
        
        # Solve 
        start_time = time.time()
        best_length = []
        best_path = []
        n = 5
        for k in range(n):
            # Solve TSP with node mapping
            n_cities = len(distances)
            path_k, length_k = run_Solver(distances, multiplier=3.6, nodes=nodes)
            
            if set(path_k) == set(nodes):   
                best_length.append(length_k)
                best_path.append(path_k)

        # Calculate best path and length in samples
        if len(best_length) == 0:
            print('Invalid Solution')
            all_clusters_data.append((None, float('inf')))  # Store invalid solution
        else:
            length = min(best_length)
            path = best_path[best_length.index(length)]

            all_clusters_data.append((path, length))  # Store valid solution
            
            Total_distance += length
            end_time = time.time()
            runtime_cluster = end_time - start_time 
            print_solution(path, length)
            print(f"Runtime: {runtime_cluster:.2f} seconds")
    
    # Total time and distance for all clusters    
    print(f"\nTotal distance: {Total_distance:.2f}")
    end_time_total = time.time()
    runtime = end_time_total - start_time_total + (n-1)*(end_time_clustering - start_time_clustering)
    print(f"\nTotal runtime: {runtime:.2f} seconds")
    Average_runtime = runtime/n
    print(f'\nAverage runtime: {Average_runtime:.2f} seconds')
    
    # Write solutions to file
    with open(output_file_path, 'w') as output_file:
        output_file.write(f"Problem: {file_path}\n")
        output_file.write(f"Number of nodes: {num_nodes}\n")
        output_file.write(f"Number of vehicles: {num_vehicles}\n")
        output_file.write(f"Vehicle capacity: {capacity}\n\n")
        
        output_file.write("CLUSTER SOLUTIONS\n")
        output_file.write("=================\n\n")
        
        for i, (path, length) in enumerate(all_clusters_data, 1):
            if path is None:
                output_file.write(f"Cluster {i}: INVALID SOLUTION\n\n")
            else:
                output_file.write(f"Cluster {i}:\n")
                output_file.write(f"Path: {path}\n")
                output_file.write(f"Length: {length:.2f}\n\n")
        
        output_file.write("SUMMARY\n")
        output_file.write("=======\n")
        output_file.write(f"Total distance: {Total_distance:.2f}\n")
        output_file.write(f"Total runtime: {runtime:.2f} seconds\n")
        output_file.write(f"Average runtime: {Average_runtime:.2f} seconds\n")

if __name__ == "__main__":
    # txt_file_path = "./Map_Datasets/E-n22-k4.txt"
    import sys
    txt_file_path = sys.argv[1] if len(sys.argv) > 1 else "./Map_Datasets/E-n22-k4.txt"
    output_path = "./CVRP_solution.txt"  # Default output path
    CVRP_Solver(txt_file_path, output_path)
