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
#  File: CVRP_Clustering_V4.py
#  Author: Rishi Mittal 
#
#  Description: Clusters CVRP into smaller clusters
#------------------------------------------------------------------------------


import numpy as np
from typing import List, Dict, Tuple
import matplotlib.pyplot as plt
import math
import re
from scipy.spatial import ConvexHull
import math 
from typing import Dict, Tuple
import numpy as np

class CVRPParser:
    """Parser for CVRP problem instances in TSPLIB format."""
    
    @staticmethod
    def parse_file(file_content: str) -> Tuple[Dict, Dict, int, int, int]:
        """Parse CVRP file content and extract problem information."""
        lines = file_content.strip().split('\n')
        coordinates = {}
        demands = {}
        capacity = 0
        num_nodes = 0
        num_vehicles = 0
        
        reading_coords = False
        reading_demands = False
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
                
            if 'DIMENSION' in line:
                num_nodes = int(line.split(':')[1].strip())
            elif 'CAPACITY' in line:
                capacity = int(line.split(':')[1].strip())
            elif 'NAME' in line:
                match = re.search(r'k(\d+)', line)
                if match:
                    num_vehicles = int(match.group(1))
            elif line == 'NODE_COORD_SECTION':
                reading_coords = True
                reading_demands = False
                continue
            elif line == 'DEMAND_SECTION':
                reading_coords = False
                reading_demands = True
                continue
            elif line == 'DEPOT_SECTION':
                break
            
            if reading_coords:
                parts = line.split()
                if len(parts) == 3:
                    node_id = int(parts[0])
                    x = float(parts[1])
                    y = float(parts[2])
                    coordinates[node_id] = (x, y)
            
            if reading_demands:
                parts = line.split()
                if len(parts) == 2:
                    node_id = int(parts[0])
                    demand = int(parts[1])
                    demands[node_id] = demand
        
        return coordinates, demands, capacity, num_nodes, num_vehicles

class CVRPSweepCluster:
    def __init__(self, coordinates: Dict[int, Tuple[float, float]], 
                 demands: Dict[int, int], 
                 capacity: int,
                 num_vehicles: int,
                 depot_id: int = 1):
        """Initialize the CVRP sweep clustering algorithm."""
        self.coordinates = coordinates
        self.demands = demands
        self.capacity = capacity
        self.num_vehicles = num_vehicles
        self.depot_id = depot_id
        
        # Convert depot-relative polar coordinates
        self.depot_coord = np.array(coordinates[depot_id])
        self.polar_angles = {}
        self.distances = {}
        
        for node_id, coord in coordinates.items():
            if node_id != depot_id:
                dx = coord[0] - self.depot_coord[0]
                dy = coord[1] - self.depot_coord[1]
                angle = math.atan2(dy, dx)
                angle_deg = math.degrees(angle)
                if angle_deg < 0:
                    angle_deg += 360
                self.polar_angles[node_id] = angle_deg
                self.distances[node_id] = math.sqrt(dx*dx + dy*dy)
    
    def calculate_cluster_center(self, cluster: List[int]) -> Tuple[float, float]:
        """Calculate the center (centroid) of a cluster."""
        if not cluster:
            return self.depot_coord
        coords = np.array([self.coordinates[n] for n in cluster])
        return tuple(np.mean(coords, axis=0))
    
    def calculate_cluster_distance(self, cluster1: List[int], cluster2: List[int]) -> float:
        """Calculate the minimum distance between any two points in different clusters."""
        min_dist = float('inf')
        for n1 in cluster1:
            for n2 in cluster2:
                dist = math.sqrt(sum((self.coordinates[n1][i] - self.coordinates[n2][i])**2 
                                   for i in range(2)))
                min_dist = min(min_dist, dist)
        return min_dist
    
    def get_cluster_demand(self, cluster: List[int]) -> int:
        """Calculate total demand for a cluster."""
        return sum(self.demands[n] for n in cluster)
    
    def find_best_clusters_to_merge(self, clusters: List[List[int]]) -> Tuple[int, int]:
        """Find the best pair of clusters to merge based on multiple criteria."""
        best_score = float('inf')
        best_pair = (0, 0)
        
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                # Check if merge is feasible (capacity constraint)
                total_demand = self.get_cluster_demand(clusters[i]) + self.get_cluster_demand(clusters[j])
                if total_demand <= self.capacity:
                    # Calculate various metrics for scoring
                    distance = self.calculate_cluster_distance(clusters[i], clusters[j])
                    
                    # Calculate angle between cluster centers
                    center1 = self.calculate_cluster_center(clusters[i])
                    center2 = self.calculate_cluster_center(clusters[j])
                    angle1 = math.atan2(center1[1] - self.depot_coord[1], 
                                      center1[0] - self.depot_coord[0])
                    angle2 = math.atan2(center2[1] - self.depot_coord[1], 
                                      center2[0] - self.depot_coord[0])
                    angle_diff = abs(math.degrees(angle1 - angle2))
                    if angle_diff > 180:
                        angle_diff = 360 - angle_diff
                    
                    # Combined score (weighted sum of distance and angle difference)
                    score = distance + 2 * angle_diff  # Angle difference weighted more
                    
                    if score < best_score:
                        best_score = score
                        best_pair = (i, j)
        
        return best_pair
    
    def merge_clusters(self, clusters: List[List[int]]) -> List[List[int]]:
        """Merge clusters until we have exactly num_vehicles clusters."""
        while len(clusters) > self.num_vehicles:
            i, j = self.find_best_clusters_to_merge(clusters)
            
            # Merge clusters[j] into clusters[i]
            clusters[i].extend(clusters[j])
            clusters.pop(j)
            
            # Sort nodes within merged cluster by polar angle
            clusters[i].sort(key=lambda x: self.polar_angles[x])
        
        return clusters
    
    def create_initial_clusters(self) -> List[List[int]]:
        """Create initial clusters using sweep algorithm with capacity constraints."""
        # Sort nodes by polar angle
        sorted_nodes = sorted(self.polar_angles.keys(), 
                            key=lambda x: self.polar_angles[x])
        
        clusters = []
        current_cluster = []
        current_demand = 0
        
        for node in sorted_nodes:
            node_demand = self.demands[node]
            
            # If adding this node would exceed capacity, start new cluster
            if current_demand + node_demand > self.capacity:
                if current_cluster:
                    clusters.append(current_cluster)
                current_cluster = [node]
                current_demand = node_demand
            else:
                current_cluster.append(node)
                current_demand += node_demand
        
        # Add final cluster if not empty
        if current_cluster:
            clusters.append(current_cluster)
        
        return clusters
    
    def create_clusters(self) -> Tuple[List[List[int]], List[int]]:
        """Create exactly num_vehicles clusters."""
        # Create initial clusters
        clusters = self.create_initial_clusters()
        
        # If we have too many clusters, merge them
        if len(clusters) > self.num_vehicles:
            clusters = self.merge_clusters(clusters)
        
        # Calculate demands for final clusters
        cluster_demands = [self.get_cluster_demand(cluster) for cluster in clusters]
        
        return clusters, cluster_demands
    
    def plot_clusters(self, clusters: List[List[int]], show_demands: bool = True):
        """Visualize the clustering solution with sweep regions."""
        plt.figure(figsize=(12, 8))
        
        # Plot depot
        plt.scatter([self.depot_coord[0]], [self.depot_coord[1]], 
                   c='red', marker='s', s=200, label='Depot')
        plt.annotate(f'Depot', self.depot_coord, xytext=(5, 5), 
                    textcoords='offset points')
        
        # Plot clusters with different colors
        colors = plt.cm.rainbow(np.linspace(0, 1, len(clusters)))
        
        # Draw lines from depot to cluster boundaries
        for cluster, color in zip(clusters, colors):
            # Get min and max angles in cluster
            angles = [self.polar_angles[n] for n in cluster]
            min_angle = min(angles)
            max_angle = max(angles)
            
            # Draw rays from depot
            for angle in [min_angle, max_angle]:
                rad = math.radians(angle)
                dx = 100 * math.cos(rad)
                dy = 100 * math.sin(rad)
                plt.plot([self.depot_coord[0], self.depot_coord[0] + dx],
                        [self.depot_coord[1], self.depot_coord[1] + dy],
                        c=color, alpha=0.3, linestyle='--')
        
        # Plot nodes and connections
        for cluster, color in zip(clusters, colors):
            # Plot nodes
            cluster_coords = np.array([self.coordinates[node_id] for node_id in cluster])
            total_demand = sum(self.demands[n] for n in cluster)
            plt.scatter(cluster_coords[:, 0], cluster_coords[:, 1], 
                       c=[color], s=100, label=f'Cluster (demand: {total_demand})')
            
            # Show demand values
            if show_demands:
                for node_id in cluster:
                    coord = self.coordinates[node_id]
                    plt.annotate(f'{node_id}\n({self.demands[node_id]})', 
                               coord, xytext=(5, 5), textcoords='offset points')
            
            # Draw connections between consecutive points
            for i in range(len(cluster)):
                node1 = cluster[i]
                node2 = cluster[(i + 1) % len(cluster)]
                plt.plot([self.coordinates[node1][0], self.coordinates[node2][0]],
                        [self.coordinates[node1][1], self.coordinates[node2][1]],
                        c=color, alpha=0.5)
        
        plt.title(f'CVRP Sweep Clustering Solution\n{len(clusters)} clusters, Vehicle Capacity: {self.capacity}')
        plt.xlabel('X Coordinate')
        plt.ylabel('Y Coordinate')
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.grid(True)
        plt.tight_layout()
        plt.show()



def create_distance_matrix_geo(coordinates, nodes: List[int]):
    
    def calculate_geo_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calculate great circle distance between two points on Earth."""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        R = 6371  # Earth's radius in kilometers
        
        # Convert degrees to radians
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(delta_phi/2)**2 + 
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    node_ids = nodes
    n = len(node_ids)
    distance_matrix = np.zeros((n, n))
    for i in range(n):
            for j in range(n):
                if i == j:
                    distance_matrix[i][j] = 0                
                else:
                    coord1 = coordinates[node_ids[i]]
                    coord2 = coordinates[node_ids[j]]
                    distance = calculate_geo_distance(coord1, coord2)
                    distance_matrix[i][j] = distance
        
    return distance_matrix

def generate_distance_matrix(coordinates: Dict[int, Tuple[float, float]], nodes: List[int]) -> np.ndarray:
    EARTH_RADIUS_M = 6371.0
    """
    Generate a simple distance matrix for the given nodes.
    
    Args:
        coordinates: Dictionary mapping node ID to (x, y) coordinates
        nodes: List of node IDs to include in the matrix
        
    Returns:
        np.ndarray: Distance matrix where entry (i,j) is distance from nodes[i] to nodes[j]
    """
    n = len(nodes)
    distance_matrix = np.zeros((n, n), dtype=float)

    # preconvert to radians to save time
    lats = np.array([np.deg2rad(coordinates[k][0]) for k in nodes])
    lons = np.array([np.deg2rad(coordinates[k][1]) for k in nodes])

    for i in range(n):
        # vectorized against all j
        dlat = lats - lats[i]
        dlon = lons - lons[i]
        a = np.sin(dlat/2.0)**2 + np.cos(lats[i]) * np.cos(lats) * np.sin(dlon/2.0)**2
        c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
        distance_matrix[i, :] = EARTH_RADIUS_M * c

    np.fill_diagonal(distance_matrix, 0.0)
    return distance_matrix

def get_cluster_matrices(coordinates: Dict[int, Tuple[float, float]], 
                        clusters: List[List[int]], 
                        depot_id: int = 1) -> List[np.ndarray]:
    """
    Generate distance matrices for each cluster including depot.
    
    Args:
        coordinates: Dictionary mapping node ID to (x, y) coordinates
        clusters: List of clusters, where each cluster is a list of node IDs
        depot_id: ID of the depot node
        
    Returns:
        List[np.ndarray]: List of distance matrices, one for each cluster
    """
    matrices = []
    i = 0
    for cluster in clusters:
        i+= 1
        print(f"\nCluster {i}:")
        # Include depot as first node
        nodes = [depot_id] + cluster
        print(nodes)
        matrix = generate_distance_matrix(coordinates, nodes)
        print(type(matrix))
        matrices.append(matrix)
    
    return matrices

# Example usage
if __name__ == "__main__":
    # Parse file and get coordinates (using existing parser)
    with open('Datasets/E-n33-k4.txt', 'r') as f:
        file_content = f.read()
    
    coordinates, demands, capacity, num_nodes, num_vehicles = CVRPParser.parse_file(file_content)
    
    # Create clusters (using existing sweep clusterer)
    clusterer = CVRPSweepCluster(coordinates, demands, capacity, num_vehicles)
    clusters, _ = clusterer.create_clusters()
    
    clusterer.plot_clusters(clusters)

    # Generate distance matrices
    distance_matrices = get_cluster_matrices(coordinates, clusters)
    
    # Print matrices
    # for i, matrix in enumerate(distance_matrices):
    #     print(f"\nDistance Matrix for Cluster {i+1}:")
    #     print(matrix.round(2))
    #     print(f"Shape: {matrix.shape}")