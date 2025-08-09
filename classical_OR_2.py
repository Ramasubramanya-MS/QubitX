import networkx as nx
import math
import matplotlib.pyplot as plt
from ortools.sat.python import cp_model
import time

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c  # distance in km

def parse_cvrp_file(filename):
    """Parse the CVRP dataset file"""
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    # Parse header information
    dimension = None
    capacity = None
    
    for line in lines:
        if line.startswith('DIMENSION'):
            dimension = int(line.split(':')[1].strip())
        elif line.startswith('CAPACITY'):
            capacity = int(line.split(':')[1].strip())
    
    # Parse coordinates
    coordinates = {}
    in_coord_section = False
    
    for line in lines:
        if line.strip() == 'NODE_COORD_SECTION':
            in_coord_section = True
            continue
        elif line.strip() == 'DEMAND_SECTION':
            in_coord_section = False
            continue
        
        if in_coord_section and line.strip() and not line.startswith('DEMAND'):
            parts = line.strip().split()
            if len(parts) == 3:
                node_id = int(parts[0])
                x = float(parts[1])
                y = float(parts[2])
                coordinates[node_id] = (x, y)
    
    # Parse demands
    demands = {}
    in_demand_section = False
    
    for line in lines:
        if line.strip() == 'DEMAND_SECTION':
            in_demand_section = True
            continue
        elif line.strip() == 'DEPOT_SECTION':
            in_demand_section = False
            continue
        
        if in_demand_section and line.strip() and not line.startswith('DEPOT'):
            parts = line.strip().split()
            if len(parts) == 2:
                node_id = int(parts[0])
                demand = int(parts[1])
                demands[node_id] = demand
    
    return dimension, capacity, coordinates, demands

def parse_cvrp_data():
    """Parse the dataset from the provided text (E-n101-k8 equivalent)"""
    
    # Dataset parameters from the file
    dimension = 101
    capacity = 200
    
    # Coordinates (node_id: (x, y))
    coordinates = {
        1: (35, 35), 2: (41, 49), 3: (35, 17), 4: (55, 45), 5: (55, 20),
        6: (15, 30), 7: (25, 30), 8: (20, 50), 9: (10, 43), 10: (55, 60),
        11: (30, 60), 12: (20, 65), 13: (50, 35), 14: (30, 25), 15: (15, 10),
        16: (30, 5), 17: (10, 20), 18: (5, 30), 19: (20, 40), 20: (15, 60),
        21: (45, 65), 22: (45, 20), 23: (45, 10), 24: (55, 5), 25: (65, 35),
        26: (65, 20), 27: (45, 30), 28: (35, 40), 29: (41, 37), 30: (64, 42),
        31: (40, 60), 32: (31, 52), 33: (35, 69), 34: (53, 52), 35: (65, 55),
        36: (63, 65), 37: (2, 60), 38: (20, 20), 39: (5, 5), 40: (60, 12),
        41: (40, 25), 42: (42, 7), 43: (24, 12), 44: (23, 3), 45: (11, 14),
        46: (6, 38), 47: (2, 48), 48: (8, 56), 49: (13, 52), 50: (6, 68),
        51: (47, 47), 52: (49, 58), 53: (27, 43), 54: (37, 31), 55: (57, 29),
        56: (63, 23), 57: (53, 12), 58: (32, 12), 59: (36, 26), 60: (21, 24),
        61: (17, 34), 62: (12, 24), 63: (24, 58), 64: (27, 69), 65: (15, 77),
        66: (62, 77), 67: (49, 73), 68: (67, 5), 69: (56, 39), 70: (37, 47),
        71: (37, 56), 72: (57, 68), 73: (47, 16), 74: (44, 17), 75: (46, 13),
        76: (49, 11), 77: (49, 42), 78: (53, 43), 79: (61, 52), 80: (57, 48),
        81: (56, 37), 82: (55, 54), 83: (15, 47), 84: (14, 37), 85: (11, 31),
        86: (16, 22), 87: (4, 18), 88: (28, 18), 89: (26, 52), 90: (26, 35),
        91: (31, 67), 92: (15, 19), 93: (22, 22), 94: (18, 24), 95: (26, 27),
        96: (25, 24), 97: (22, 27), 98: (25, 21), 99: (19, 21), 100: (20, 26),
        101: (18, 18)
    }
    
    # Demands (node_id: demand)
    demands = {
        1: 0, 2: 10, 3: 7, 4: 13, 5: 19, 6: 26, 7: 3, 8: 5, 9: 9, 10: 16,
        11: 16, 12: 12, 13: 19, 14: 23, 15: 20, 16: 8, 17: 19, 18: 2, 19: 12, 20: 17,
        21: 9, 22: 11, 23: 18, 24: 29, 25: 3, 26: 6, 27: 17, 28: 16, 29: 16, 30: 9,
        31: 21, 32: 27, 33: 23, 34: 11, 35: 14, 36: 8, 37: 5, 38: 8, 39: 16, 40: 31,
        41: 9, 42: 5, 43: 5, 44: 7, 45: 18, 46: 16, 47: 1, 48: 27, 49: 36, 50: 30,
        51: 13, 52: 10, 53: 9, 54: 14, 55: 18, 56: 2, 57: 6, 58: 7, 59: 18, 60: 28,
        61: 3, 62: 13, 63: 19, 64: 10, 65: 9, 66: 20, 67: 25, 68: 25, 69: 36, 70: 6,
        71: 5, 72: 15, 73: 25, 74: 9, 75: 8, 76: 18, 77: 13, 78: 14, 79: 3, 80: 23,
        81: 6, 82: 26, 83: 16, 84: 11, 85: 7, 86: 41, 87: 35, 88: 26, 89: 9, 90: 15,
        91: 3, 92: 1, 93: 2, 94: 22, 95: 27, 96: 20, 97: 11, 98: 12, 99: 10, 100: 9,
        101: 17
    }
    
    return dimension, capacity, coordinates, demands

def solve_cvrp_ortools(filename=None, k=8, time_limit_seconds=300):
    """
    Solve CVRP using OR-Tools CP-SAT solver
    
    Args:
        filename: Path to CVRP dataset file (optional)
        k: Number of vehicles
        time_limit_seconds: Time limit for solver
    
    Returns:
        routes: List of routes, where each route is a list of nodes
        total_distance: Total distance of the solution
        status: Solver status
    """
    
    # Parse dataset
    if filename:
        dimension, capacity, coordinates, demands = parse_cvrp_file(filename)
        # Extract k from filename if follows standard format
        if 'k' in filename:
            k = int(filename.split('k')[1].split('.')[0].split('-')[0])
    else:
        dimension, capacity, coordinates, demands = parse_cvrp_data()
    
    # Problem parameters
    n = dimension - 1  # number of demand points (excluding depot)
    depot = 0
    dem_points = list(range(1, n + 1))
    
    # Create position and demand mappings (0-based indexing)
    my_pos = {}
    q = {}
    
    # Map depot (node 1 in dataset becomes node 0)
    my_pos[depot] = coordinates[1]
    q[depot] = demands[1]  # should be 0
    
    # Map demand points (nodes 2-n+1 in dataset become nodes 1-n)
    for i in range(1, n + 1):
        my_pos[i] = coordinates[i + 1]
        q[i] = demands[i + 1]
    
    # Create complete directed graph and calculate distances
    G = nx.complete_graph(n + 1, nx.DiGraph())
    
    def eucl_dist(x1, y1, x2, y2):
        return math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
    
    # Calculate distance matrix (scaled to integers for CP-SAT)
    distances = {}
    scale_factor = 100  # Scale distances to avoid floating point issues
    
    for i, j in G.edges:
        (x1, y1) = my_pos[i]
        (x2, y2) = my_pos[j]
        dist = haversine(x1, y1, x2, y2)
        distances[(i, j)] = int(dist * scale_factor)
        G.edges[i, j]['length'] = dist
    
    Q = capacity
    
    print(f"Solving CVRP with OR-Tools")
    print(f"Nodes: {dimension} (including depot)")
    print(f"Vehicles: {k}")
    print(f"Capacity: {Q}")
    print(f"Total demand: {sum(q[i] for i in dem_points)}")
    
    # Create CP-SAT model
    model = cp_model.CpModel()
    
    # Decision variables: x[i][j] = 1 if edge (i,j) is used
    x = {}
    for i, j in G.edges:
        x[(i, j)] = model.NewBoolVar(f'x_{i}_{j}')
    
    # Load variables for MTZ constraints
    u = {}
    for i in G.nodes:
        if i == depot:
            u[i] = model.NewIntVar(0, 0, f'u_{i}')
        else:
            u[i] = model.NewIntVar(q[i], Q, f'u_{i}')
    
    # Objective: minimize total distance
    objective_terms = []
    for i, j in G.edges:
        objective_terms.append(distances[(i, j)] * x[(i, j)])
    
    model.Minimize(sum(objective_terms))
    
    # Constraints
    
    # 1. Enter each demand point exactly once
    for j in dem_points:
        model.Add(sum(x[(i, j)] for i in G.predecessors(j)) == 1)
    
    # 2. Leave each demand point exactly once  
    for i in dem_points:
        model.Add(sum(x[(i, j)] for j in G.successors(i)) == 1)
    
    # 3. Leave depot exactly k times
    model.Add(sum(x[(depot, j)] for j in G.successors(depot)) == k)
    
    # 4. MTZ constraints for subtour elimination and capacity
    for i, j in G.edges:
        if j != depot:
            # u[i] - u[j] + Q * x[i,j] <= Q - q[j]
            model.Add(u[i] - u[j] + Q * x[(i, j)] <= Q - q[j])
    
    # Create solver and set time limit
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    
    # Solve
    print("Solving...")
    status = solver.Solve(model)
    
    # Extract solution
    routes = []
    total_distance = 0
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        print(f"\nSolution found!")
        print(f"Status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}")
        print(f"Objective value: {solver.ObjectiveValue() / scale_factor:.2f}")
        
        # Extract used edges
        used_edges = []
        for i, j in G.edges:
            if solver.Value(x[(i, j)]) > 0.5:
                used_edges.append((i, j))
        
        print(f"Used edges: {len(used_edges)}")
        
        # Build routes by following edges from depot
        routes = []
        remaining_edges = used_edges.copy()
        
        # Find all routes starting from depot
        depot_edges = [(i, j) for i, j in remaining_edges if i == depot]
        
        for depot_edge in depot_edges:
            route = [depot]
            current_node = depot_edge[1]
            route.append(current_node)
            remaining_edges.remove(depot_edge)
            
            # Follow the route until we return to depot
            while current_node != depot:
                next_edges = [(i, j) for i, j in remaining_edges if i == current_node]
                if not next_edges:
                    break
                
                next_edge = next_edges[0]
                current_node = next_edge[1]
                route.append(current_node)
                remaining_edges.remove(next_edge)
                
                if current_node == depot:
                    break
            
            routes.append(route)
        
        # Calculate actual total distance
        total_distance = 0
        s = 0 
        for route in routes:
            s+=1
            route_distance = 0
            route_demand = 0
            for i in range(len(route) - 1):
                from_node = route[i]
                to_node = route[i + 1]
                route_distance += G.edges[from_node, to_node]['length']
                if to_node != depot:
                    route_demand += q[to_node]
            total_distance += route_distance
            print(f"Route {s}: {route} - Distance: {route_distance:.2f}, Demand: {route_demand}")
        
        print(f"Total distance: {total_distance:.2f}")
        
        # Visualize solution
        # plt.figure(figsize=(12, 10))
        
        # Draw all nodes
        # nx.draw_networkx_nodes(G, pos=my_pos, node_color='lightblue', 
        #                       node_size=50, alpha=0.7)
        
        # # Draw depot in different color
        # nx.draw_networkx_nodes(G, pos=my_pos, nodelist=[depot], 
                            #   node_color='red', node_size=100)
        
        # Draw solution edges
        # solution_graph = G.edge_subgraph(used_edges)
        # nx.draw_networkx_edges(solution_graph, pos=my_pos, edge_color='blue', 
        #                       width=2, alpha=0.8)
        
        # # Add node labels
        # nx.draw_networkx_labels(G, pos=my_pos, font_size=6)
        
        # plt.title(f"CVRP Solution using OR-Tools\nVehicles: {k}, Distance: {total_distance:.2f}")
        # plt.axis('equal')
        # plt.grid(True, alpha=0.3)
        # plt.show()
        
    else:
        print(f"No solution found. Status: {status}")
    
    return routes, total_distance, status

# Example usage
if __name__ == "__main__":
    # Solve using embedded data
    # routes, distance, status = solve_cvrp_ortools(k=8, time_limit_seconds=120)
    
    # print(f"\nFinal Results:")
    # print(f"Number of routes: {len(routes)}")
    # print(f"Routes: {routes}")
    # print(f"Total distance: {distance:.2f}")
    start_time = time.time()
    # You can also solve using a file:
    import sys
    txt_file_path = sys.argv[1] if len(sys.argv) > 1 else "./Map_Datasets/E-n22-k4.txt"
    # txt_file_path = "./Map_Datasets/E-n22-k4.txt"
    routes, distance, status = solve_cvrp_ortools(txt_file_path, k = 4 ,time_limit_seconds=20)

    print(f"\nFinal Results:")
    # print(f"Number of routes: {len(routes)}")
    # print(f"Routes: {routes}")
    print(f"Total distance: {distance:.2f}")
    print(f"Actual Runtime: {time.time()-start_time:.2f}s")