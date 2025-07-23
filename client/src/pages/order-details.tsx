import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plane, Calendar, Users, CreditCard, ArrowLeft, 
  Download, Edit, X, Clock, MapPin 
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OrderDetails() {
  const { orderNumber } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["/api/orders", orderNumber],
    enabled: !!orderNumber && isAuthenticated,
  });

  const { data: flight } = useQuery({
    queryKey: ["/api/flights", order?.flightId],
    enabled: !!order?.flightId,
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("DELETE", `/api/orders/${orderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled and refund has been processed to your wallet.",
      });
      setLocation("/my-orders");
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel order. Please contact customer service.",
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    if (order && window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      cancelOrderMutation.mutate(order.id);
    }
  };

  const [showAddServices, setShowAddServices] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('online_booking');

  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    enabled: showAddServices,
  });

  // Payment method options
  const paymentMethods = [
    { value: 'online_booking', label: 'Online Booking' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI Payment' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' }
  ];

  const addServicesMutation = useMutation({
    mutationFn: async ({ services, paymentMethod }: { services: any[], paymentMethod: string }) => {
      const response = await apiRequest("POST", `/api/orders/${orderNumber}/add-services`, {
        services: services.map(service => ({
          id: service.id,
          quantity: service.quantity || 1
        })),
        paymentMethod
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddServices(false);
      setSelectedServices([]);
      toast({
        title: "Services Added Successfully",
        description: `${data.addedServices.length} service(s) added. Payment of $${data.paymentDetails.amount} processed via ${paymentMethods.find(m => m.value === data.paymentDetails.method)?.label || data.paymentDetails.method}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Services",
        description: error.message || "Please try again or contact customer service.",
        variant: "destructive",
      });
    },
  });

  const removeServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiRequest("POST", `/api/orders/${orderNumber}/remove-service`, {
        serviceId
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Service Removed",
        description: `"${data.refundDetails.serviceName}" removed. $${data.refundDetails.totalRefund} refund processed via ${data.refundDetails.refundMethod}.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to Remove Service",
        description: "Please try again or contact customer service.",
        variant: "destructive",
      });
    },
  });

  const handleModify = () => {
    setShowAddServices(true);
  };

  const handleServiceToggle = (service: any) => {
    const exists = selectedServices.find(s => s.id === service.id);
    if (exists) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    } else {
      setSelectedServices(prev => [...prev, { ...service, quantity: 1 }]);
    }
  };

  const handleAddSelectedServices = () => {
    if (selectedServices.length > 0) {
      addServicesMutation.mutate({ 
        services: selectedServices, 
        paymentMethod 
      });
    }
  };

  const handleRemoveService = (serviceId: number) => {
    if (window.confirm("Are you sure you want to remove this service? You will receive a full refund via your original payment method.")) {
      removeServiceMutation.mutate(serviceId);
    }
  };

  const getTotalAdditionalCost = () => {
    return selectedServices.reduce((total, service) => 
      total + (parseFloat(service.price) * (service.quantity || 1)), 0
    );
  };

  const handleDownloadTicket = () => {
    // Download e-ticket (placeholder)
    toast({
      title: "Download Started",
      description: "Your e-ticket is being downloaded.",
    });
  };

  const handleCheckIn = () => {
    setLocation("/check-in");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => setLocation("/my-orders")}>
              Go to My Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/my-orders")}
            className="mb-4 text-airline-blue hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Orders
          </Button>
        </div>

        {/* Order Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                <p className="text-gray-600">Booked on {formatDate(order.createdAt)}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(order.status)}
                <p className="text-sm text-gray-600 mt-1">
                  Total: <span className="font-bold text-lg text-airline-blue">
                    ${parseFloat(order.total).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Details */}
        {flight && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Flight Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Plane className="h-4 w-4 text-airline-blue" />
                      <span className="text-sm text-gray-600">From</span>
                    </div>
                    <p className="font-semibold text-gray-900">{flight.departureAirport}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(flight.departureTime)} • {formatTime(flight.departureTime)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">Flight Duration</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 bg-airline-blue rounded-full"></div>
                      <div className="flex-1 border-t border-gray-300 mx-2"></div>
                      <Plane className="h-4 w-4 text-airline-blue" />
                      <div className="flex-1 border-t border-gray-300 mx-2"></div>
                      <div className="w-4 h-4 bg-airline-blue rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {flight.duration} {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  
                  <div className="text-right md:text-left">
                    <div className="flex items-center justify-end md:justify-start space-x-2 mb-2">
                      <MapPin className="h-4 w-4 text-airline-blue" />
                      <span className="text-sm text-gray-600">To</span>
                    </div>
                    <p className="font-semibold text-gray-900">{flight.arrivalAirport}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(flight.arrivalTime)} • {formatTime(flight.arrivalTime)}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Flight</span>
                    <p className="font-medium">{flight.airline} {flight.flightNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Aircraft</span>
                    <p className="font-medium">{flight.aircraft}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Class</span>
                    <p className="font-medium capitalize">{flight.class.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multi-Passenger Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Passenger Information ({Array.isArray(order.passengerInfo) ? order.passengerInfo.length : 1} passenger{Array.isArray(order.passengerInfo) && order.passengerInfo.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Handle both array and single passenger formats
              const passengers = Array.isArray(order.passengerInfo) ? order.passengerInfo : 
                               (order.passengerInfo ? [order.passengerInfo] : []);
              
              return passengers.map((passenger: any, index: number) => (
                <div key={index} className={`bg-gray-50 rounded-lg p-4 ${index > 0 ? 'mt-4' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">
                      Passenger {index + 1}
                    </h4>
                    <Badge variant="outline" className="text-airline-blue border-airline-blue">
                      {passenger.firstName} {passenger.lastName}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Name</span>
                      <p className="font-medium">{passenger.firstName} {passenger.lastName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email</span>
                      <p className="font-medium">{passenger.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Phone</span>
                      <p className="font-medium">{passenger.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Date of Birth</span>
                      <p className="font-medium">{passenger.dateOfBirth ? formatDate(passenger.dateOfBirth) : 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Gender</span>
                      <p className="font-medium capitalize">{passenger.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Nationality</span>
                      <p className="font-medium">{passenger.nationality?.toUpperCase() || 'Not specified'}</p>
                    </div>
                  </div>

                  {passenger.passportNumber && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">Passport Number</span>
                        <p className="font-medium">{passenger.passportNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Passport Expiry</span>
                        <p className="font-medium">{passenger.passportExpiry ? formatDate(passenger.passportExpiry) : 'Not provided'}</p>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <span className="text-sm text-gray-600">Seat Assignment</span>
                    <p className="font-medium">
                      {passenger.seatNumber ? 
                        `Seat ${passenger.seatNumber} (${passenger.seatClass || 'Economy'})` : 
                        'Will be assigned at check-in'
                      }
                    </p>
                  </div>
                  
                  {/* Individual Passenger Services */}
                  {passenger.services && Array.isArray(passenger.services) && passenger.services.length > 0 ? (
                    <div className="border-t pt-3 mt-3">
                      <span className="text-sm text-gray-600 block mb-2">Services for {passenger.firstName}</span>
                      <div className="space-y-1">
                        {passenger.services.map((service: any, serviceIndex: number) => (
                          <div key={serviceIndex} className="flex justify-between text-sm">
                            <span>{service.name} {service.quantity > 1 && `(x${service.quantity})`}</span>
                            <span className="font-medium">${(parseFloat(service.price) * service.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : passengers.length === 1 && order.selectedServices && Array.isArray(order.selectedServices) && order.selectedServices.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <span className="text-sm text-gray-600 block mb-2">Selected Services</span>
                      <div className="space-y-1">
                        {order.selectedServices.map((service: any, serviceIndex: number) => (
                          <div key={serviceIndex} className="flex justify-between text-sm">
                            <span>{service.name} {service.quantity > 1 && `(x${service.quantity})`}</span>
                            <span className="font-medium">${(parseFloat(service.price) * service.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
          </CardContent>
        </Card>

        {/* Services & Add-ons */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Additional Services</CardTitle>
              {order.status === 'confirmed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleModify}
                  className="border-airline-blue text-airline-blue hover:bg-airline-blue hover:text-white"
                >
                  Add Services
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {order.selectedServices && order.selectedServices.length > 0 ? (
              <div className="space-y-3">
                {order.selectedServices.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-airline-blue rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-airline-blue">
                        ${parseFloat(service.price).toFixed(2)}
                      </span>
                      {order.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveService(service.id)}
                          disabled={removeServiceMutation.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No additional services selected</p>
                {order.status === 'confirmed' && (
                  <p className="text-sm mt-2">You can add services to enhance your travel experience</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Services Modal */}
        {showAddServices && (
          <Card className="mb-6 border-airline-blue">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Services to Your Booking</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddServices(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {services && services.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {services.map((service: any) => {
                      const isSelected = selectedServices.find(s => s.id === service.id);
                      return (
                        <div 
                          key={service.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'border-airline-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleServiceToggle(service)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold">{service.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {service.phase}
                                </Badge>
                                {service.tag && (
                                  <Badge variant="outline" className="text-xs">
                                    {service.tag.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-airline-blue">
                                ${parseFloat(service.price).toFixed(2)}
                              </p>
                              {isSelected && (
                                <div className="w-5 h-5 bg-airline-blue rounded-full flex items-center justify-center mt-1 ml-auto">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Selected Services ({selectedServices.length})</h4>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Cost Breakdown</p>
                          <p className="text-sm">Services: ${getTotalAdditionalCost().toFixed(2)}</p>
                          <p className="text-sm">Taxes: ${(getTotalAdditionalCost() * 0.12).toFixed(2)}</p>
                          <p className="font-bold text-airline-blue text-lg">
                            Total: ${(getTotalAdditionalCost() * 1.12).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-blue-800">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger className="mt-1 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-blue-600">
                            Payment will be processed securely through your selected method
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddSelectedServices}
                          disabled={addServicesMutation.isPending}
                          className="flex-1"
                        >
                          {addServicesMutation.isPending 
                            ? 'Processing Payment...' 
                            : `Pay $${(getTotalAdditionalCost() * 1.12).toFixed(2)} & Add Services`
                          }
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedServices([]);
                            setShowAddServices(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
                  <p>Loading available services...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees</span>
                <span>${parseFloat(order.taxes).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-airline-blue">${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {order.status === 'confirmed' && !order.isCheckedIn && (
            <>
              <Button
                onClick={handleCheckIn}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                disabled={!order.canCheckIn}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {order.canCheckIn ? 'Web Check-in' : 'Check-in Unavailable'}
              </Button>
              
              <Button
                onClick={handleModify}
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modify Services
              </Button>
            </>
          )}
          
          <Button
            onClick={handleDownloadTicket}
            variant="outline"
            className="text-airline-blue border-airline-blue hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download E-Ticket
          </Button>
          
          {(order.status === 'confirmed' || order.status === 'pending') && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              disabled={cancelOrderMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </div>

        {/* Check-in Available Notice */}
        {order.canCheckIn && !order.isCheckedIn && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800">
                <strong>Check-in now available!</strong> Complete your check-in up to 24 hours before departure.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
