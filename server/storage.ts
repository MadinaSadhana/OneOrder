import { 
  users, flights, seats, services, orders, bookingHistory,
  type User, type InsertUser, type Flight, type InsertFlight,
  type Seat, type InsertSeat, type Service, type InsertService,
  type Order, type InsertOrder, type BookingHistory, type InsertBookingHistory
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, gte, lte, ilike } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Flight methods
  searchFlights(criteria: {
    from: string;
    to: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    class: string;
  }): Promise<Flight[]>;
  getFlight(id: number): Promise<Flight | undefined>;
  createFlight(flight: InsertFlight): Promise<Flight>;
  
  // Seat methods
  getFlightSeats(flightId: number): Promise<Seat[]>;
  getSeat(id: number): Promise<Seat | undefined>;
  updateSeatAvailability(id: number, isAvailable: boolean): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  
  // Service methods
  getServices(phase?: string): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  updateServiceInventory(id: number, inventory: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  cancelOrder(id: number): Promise<Order | undefined>;
  removeServiceFromOrder(orderId: number, serviceId: number): Promise<Order | undefined>;
  
  // Wallet methods
  updateWalletBalance(userId: number, amount: number): Promise<User | undefined>;
  addWalletTransaction(userId: number, amount: number, type: 'credit' | 'debit', description: string): Promise<void>;
  
  // Booking history methods
  createBookingHistory(history: InsertBookingHistory): Promise<BookingHistory>;
  getUserBookingHistory(userId: number): Promise<BookingHistory[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeMockData();
  }

  private async initializeMockData() {
    // Check if data already exists to avoid duplicates
    const existingFlights = await db.select().from(flights).limit(1);
    if (existingFlights.length > 0) {
      return; // Data already exists, skip initialization
    }
    // Create sample flights
    const sampleFlights: InsertFlight[] = [
      {
        flightNumber: "SL1234",
        airline: "SkyLink Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T08:30:00Z"),
        arrivalTime: new Date("2024-12-15T11:00:00Z"),
        duration: "5h 30m",
        aircraft: "Boeing 737-800",
        stops: 0,
        stopAirports: [],
        price: "299.00",
        availableSeats: 150,
        totalSeats: 180,
        class: "economy"
      },
      {
        flightNumber: "SL789",
        airline: "SkyLink Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T14:45:00Z"),
        arrivalTime: new Date("2024-12-15T17:00:00Z"),
        duration: "5h 15m",
        aircraft: "Boeing 737-800",
        stops: 0,
        stopAirports: [],
        price: "329.00",
        availableSeats: 120,
        totalSeats: 180,
        class: "economy"
      },
      {
        flightNumber: "DL456",
        airline: "Delta Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T06:15:00Z"),
        arrivalTime: new Date("2024-12-15T11:00:00Z"),
        duration: "7h 45m",
        aircraft: "Boeing 757-200",
        stops: 1,
        stopAirports: ["ORD"],
        price: "249.00",
        availableSeats: 95,
        totalSeats: 150,
        class: "economy"
      }
    ];

    // Create flights asynchronously if they don't exist
    for (const flight of sampleFlights) {
      try {
        await this.createFlight(flight);
      } catch (error) {
        // Ignore duplicate key errors since we have unique constraints
        if (!error.message?.includes('duplicate key')) {
          console.error('Error creating flight:', error);
        }
      }
    }

    // Create sample services across all phases
    const sampleServices: InsertService[] = [
      // Booking Phase Services
      {
        name: "Priority Boarding",
        description: "Skip the line and board before general passengers",
        category: "boarding",
        phase: "booking",
        price: "25.00",
        inventory: 50,
        tag: "recommended",
        isActive: true
      },
      {
        name: "Extra Baggage",
        description: "Additional 23kg checked baggage allowance",
        category: "baggage",
        phase: "booking",
        price: "35.00",
        inventory: 30,
        tag: "only_few_left",
        isActive: true
      },
      {
        name: "Travel Insurance",
        description: "Complete coverage for trip cancellation and medical",
        category: "insurance",
        phase: "booking",
        price: "49.00",
        inventory: 100,
        tag: "recommended",
        isActive: true
      },
      {
        name: "Lounge Access",
        description: "Premium lounge with food, drinks, and WiFi",
        category: "lounge",
        phase: "booking",
        price: "65.00",
        inventory: 15,
        tag: "filling_fast",
        isActive: true
      },
      {
        name: "Meal Pre-booking",
        description: "Choose your preferred meal from our menu",
        category: "meal",
        phase: "booking",
        price: "18.00",
        inventory: 80,
        tag: "",
        isActive: true
      },
      {
        name: "Fast Track Security",
        description: "Skip regular security lines at the airport",
        category: "security",
        phase: "booking",
        price: "29.00",
        inventory: 40,
        tag: "",
        isActive: true
      },
      {
        name: "Flexible Ticket",
        description: "Change your flight without fees",
        category: "flexibility",
        phase: "booking",
        price: "75.00",
        inventory: 100,
        tag: "peace_of_mind",
        isActive: true
      },

      // Pre-Boarding Phase Services
      {
        name: "Early Check-in",
        description: "Check in 48 hours before departure",
        category: "check_in",
        phase: "pre_boarding",
        price: "15.00",
        inventory: 80,
        tag: "convenience",
        isActive: true
      },
      {
        name: "Excess Baggage",
        description: "Additional baggage beyond standard allowance",
        category: "baggage",
        phase: "pre_boarding",
        price: "50.00",
        inventory: 25,
        tag: "limited",
        isActive: true
      },
      {
        name: "Special Assistance",
        description: "Wheelchair or mobility assistance",
        category: "assistance",
        phase: "pre_boarding",
        price: "0.00",
        inventory: 20,
        tag: "complimentary",
        isActive: true
      },
      {
        name: "Pet Travel",
        description: "In-cabin pet transportation",
        category: "pet",
        phase: "pre_boarding",
        price: "125.00",
        inventory: 5,
        tag: "very_limited",
        isActive: true
      },
      {
        name: "Wi-Fi Access",
        description: "High-speed internet throughout your journey",
        category: "connectivity",
        phase: "pre_boarding",
        price: "19.00",
        inventory: 150,
        tag: "popular",
        isActive: true
      },

      // In-Flight Phase Services
      {
        name: "Premium Cabin Upgrade",
        description: "Upgrade to business class seating",
        category: "upgrade",
        phase: "in_flight",
        price: "299.00",
        inventory: 4,
        tag: "luxury",
        isActive: true
      },
      {
        name: "Gourmet Meal",
        description: "Chef-prepared premium dining experience",
        category: "dining",
        phase: "in_flight",
        price: "45.00",
        inventory: 30,
        tag: "premium",
        isActive: true
      },
      {
        name: "Duty-Free Shopping",
        description: "Pre-order duty-free items for collection",
        category: "shopping",
        phase: "in_flight",
        price: "0.00",
        inventory: 100,
        tag: "tax_free",
        isActive: true
      },
      {
        name: "Entertainment Upgrade",
        description: "Premium movies and shows selection",
        category: "entertainment",
        phase: "in_flight",
        price: "12.00",
        inventory: 75,
        tag: "entertainment",
        isActive: true
      },
      {
        name: "Power Outlet Access",
        description: "Guaranteed power outlet at your seat",
        category: "power",
        phase: "in_flight",
        price: "8.00",
        inventory: 60,
        tag: "essential",
        isActive: true
      },

      // Arrival Phase Services
      {
        name: "Meet & Assist Arrival",
        description: "Personal assistance upon landing",
        category: "assistance",
        phase: "arrival",
        price: "85.00",
        inventory: 15,
        tag: "vip",
        isActive: true
      },
      {
        name: "Priority Baggage",
        description: "First baggage off the plane",
        category: "baggage",
        phase: "arrival",
        price: "35.00",
        inventory: 40,
        tag: "time_saver",
        isActive: true
      },
      {
        name: "Ground Transportation",
        description: "Pre-booked taxi or car service",
        category: "transport",
        phase: "arrival",
        price: "65.00",
        inventory: 20,
        tag: "convenient",
        isActive: true
      },
      {
        name: "Immigration Fast Track",
        description: "Skip immigration queues",
        category: "immigration",
        phase: "arrival",
        price: "55.00",
        inventory: 12,
        tag: "express",
        isActive: true
      },
      {
        name: "Hotel Booking Assistance",
        description: "Help finding and booking accommodation",
        category: "accommodation",
        phase: "arrival",
        price: "25.00",
        inventory: 30,
        tag: "helpful",
        isActive: true
      },
      {
        name: "Travel SIM Card",
        description: "Local SIM card with data plan",
        category: "connectivity",
        phase: "arrival",
        price: "35.00",
        inventory: 50,
        tag: "stay_connected",
        isActive: true
      }
    ];

    // Create services asynchronously if they don't exist
    for (const service of sampleServices) {
      try {
        await this.createService(service);
      } catch (error: any) {
        // Ignore duplicate key errors since we have unique constraints
        if (!error.message?.includes('duplicate key') && error.code !== '23505') {
          console.error('Error creating service:', error);
        }
      }
    }

    // Create sample seats for flights
    const seatTypes = ["economy", "premium_economy", "business", "first"];
    const seatClasses = ["window", "aisle", "middle"];
    
    for (let flightId = 1; flightId <= 3; flightId++) {
      // Economy seats (rows 10-30)
      for (let row = 10; row <= 30; row++) {
        const seats = ["A", "B", "C", "D", "E", "F"];
        seats.forEach((letter, index) => {
          const isExtraLegroom = row === 12; // Exit row
          const seatClass = index === 0 || index === 5 ? "window" : 
                           index === 1 || index === 4 ? "aisle" : "middle";
          
          this.createSeat({
            flightId,
            seatNumber: `${row}${letter}`,
            seatType: "economy",
            seatClass,
            isAvailable: Math.random() > 0.3, // 70% available
            isExtraLegroom,
            price: isExtraLegroom ? "45.00" : "0.00"
          });
        });
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Flight methods
  async searchFlights(criteria: {
    from: string;
    to: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    class: string;
  }): Promise<Flight[]> {
    return await db.select().from(flights).where(
      and(
        ilike(flights.departureAirport, `%${criteria.from}%`),
        ilike(flights.arrivalAirport, `%${criteria.to}%`),
        gte(flights.availableSeats, criteria.passengers)
      )
    );
  }

  async getFlight(id: number): Promise<Flight | undefined> {
    const [flight] = await db.select().from(flights).where(eq(flights.id, id));
    return flight || undefined;
  }

  async createFlight(insertFlight: InsertFlight): Promise<Flight> {
    const [flight] = await db
      .insert(flights)
      .values(insertFlight)
      .returning();
    return flight;
  }

  // Seat methods
  async getFlightSeats(flightId: number): Promise<Seat[]> {
    return await db.select().from(seats).where(eq(seats.flightId, flightId));
  }

  async getSeat(id: number): Promise<Seat | undefined> {
    const [seat] = await db.select().from(seats).where(eq(seats.id, id));
    return seat || undefined;
  }

  async updateSeatAvailability(id: number, isAvailable: boolean): Promise<Seat | undefined> {
    const [seat] = await db
      .update(seats)
      .set({ isAvailable })
      .where(eq(seats.id, id))
      .returning();
    return seat || undefined;
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const [seat] = await db
      .insert(seats)
      .values(insertSeat)
      .returning();
    return seat;
  }

  // Service methods
  async getServices(phase?: string): Promise<Service[]> {
    if (phase) {
      return await db.select().from(services).where(
        and(eq(services.isActive, true), eq(services.phase, phase))
      );
    }
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async updateServiceInventory(id: number, inventory: number): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ inventory })
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    
    if (!order) return undefined;

    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderNumber = `SL${Date.now().toString().slice(-6)}`;
    
    // Auto-assign random seats for all passengers
    let assignedSeats: any[] = [];
    if (insertOrder.flightId && insertOrder.passengerInfo) {
      const passengers = insertOrder.passengerInfo as any[];
      const availableSeats = await this.getFlightSeats(insertOrder.flightId);
      const economySeats = availableSeats.filter(seat => 
        seat.isAvailable && seat.seatType === 'economy' && !seat.isExtraLegroom
      );
      
      // Randomly assign seats to passengers
      const shuffledSeats = [...economySeats].sort(() => Math.random() - 0.5);
      assignedSeats = passengers.map((passenger, index) => ({
        passengerId: index,
        passengerName: `${passenger.firstName} ${passenger.lastName}`,
        seatId: shuffledSeats[index]?.id,
        seatNumber: shuffledSeats[index]?.seatNumber,
        seatType: shuffledSeats[index]?.seatType,
        seatClass: shuffledSeats[index]?.seatClass
      }));
      
      // Mark seats as unavailable
      for (const seatAssignment of assignedSeats) {
        if (seatAssignment.seatId) {
          await this.updateSeatAvailability(seatAssignment.seatId, false);
        }
      }
    }
    
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        orderNumber,
        assignedSeats,
      })
      .returning();
    return order;
  }

  async updateOrder(id: number, updates: any): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async cancelOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: "cancelled",
        paymentStatus: "refunded"
      })
      .where(eq(orders.id, id))
      .returning();
    
    // Add refund to user wallet
    if (order.userId) {
      const user = await this.getUser(order.userId);
      if (user) {
        const newBalance = (parseFloat(user.walletBalance || "0") + parseFloat(order.total)).toFixed(2);
        await this.updateUser(order.userId, { walletBalance: newBalance });
      }
    }
    
    return updatedOrder;
  }

  async removeServiceFromOrder(orderId: number, serviceId: number): Promise<Order | undefined> {
    const order = await this.getOrder(orderId);
    if (!order || !order.selectedServices) return undefined;

    const services = order.selectedServices as any[];
    const serviceIndex = services.findIndex((s: any) => s.id === serviceId);
    
    if (serviceIndex === -1) return undefined;

    const removedService = services[serviceIndex];
    const updatedServices = services.filter((s: any) => s.id !== serviceId);
    
    // Recalculate totals
    const servicePrice = parseFloat(removedService.price) * (removedService.quantity || 1);
    const newSubtotal = parseFloat(order.subtotal) - servicePrice;
    const newTaxes = newSubtotal * 0.12;
    const newTotal = newSubtotal + newTaxes;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        selectedServices: updatedServices,
        subtotal: newSubtotal.toFixed(2),
        taxes: newTaxes.toFixed(2),
        total: newTotal.toFixed(2),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder || undefined;
  }

  async updateWalletBalance(userId: number, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const currentBalance = parseFloat(user.walletBalance || "0.00");
    const newBalance = currentBalance + amount;

    const [updatedUser] = await db
      .update(users)
      .set({ walletBalance: newBalance.toFixed(2) })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser || undefined;
  }

  async addWalletTransaction(userId: number, amount: number, type: 'credit' | 'debit', description: string): Promise<void> {
    // This would be implemented with a transactions table in a real system
    // For now, we'll just log it
    console.log(`Wallet ${type}: User ${userId}, Amount: ${amount}, Description: ${description}`);
  }

  // Booking history methods
  async createBookingHistory(insertHistory: InsertBookingHistory): Promise<BookingHistory> {
    const [history] = await db
      .insert(bookingHistory)
      .values({
        ...insertHistory,
        timestamp: new Date(),
      })
      .returning();
    return history;
  }

  async getUserBookingHistory(userId: number): Promise<BookingHistory[]> {
    return await db.select().from(bookingHistory).where(eq(bookingHistory.userId, userId));
  }
}

export const storage = new DatabaseStorage();
