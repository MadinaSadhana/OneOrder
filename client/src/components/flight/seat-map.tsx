import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { Seat } from "@shared/schema";

interface SeatMapProps {
  flightId: number;
  onSeatSelect: (seat: Seat, passengerIndex?: number) => void;
  selectedSeats?: Seat[];
  passengerCount?: number;
  currentPassenger?: number;
}

export default function SeatMap({ 
  flightId, 
  onSeatSelect, 
  selectedSeats = [], 
  passengerCount = 1,
  currentPassenger = 0 
}: SeatMapProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>(
    selectedSeats.map(seat => seat.id)
  );

  const { data: seats = [], isLoading } = useQuery<Seat[]>({
    queryKey: ["/api/flights", flightId, "seats"],
    enabled: !!flightId && flightId !== null,
  });

  useEffect(() => {
    setSelectedSeatIds(selectedSeats.map(seat => seat.id));
  }, [selectedSeats]);

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) return;
    
    // Check if seat is already selected by another passenger
    if (selectedSeatIds.includes(seat.id)) return;
    
    const newSelectedSeatIds = [...selectedSeatIds];
    newSelectedSeatIds[currentPassenger] = seat.id;
    setSelectedSeatIds(newSelectedSeatIds);
    onSeatSelect(seat, currentPassenger);
  };

  const getSeatClassName = (seat: Seat) => {
    const baseClasses = "w-8 h-8 rounded text-xs font-medium border cursor-pointer transition-colors";
    
    if (!seat.isAvailable) {
      return `${baseClasses} seat-occupied cursor-not-allowed`;
    }
    
    if (selectedSeatIds.includes(seat.id)) {
      const passengerIndex = selectedSeatIds.indexOf(seat.id);
      if (passengerIndex === currentPassenger) {
        return `${baseClasses} seat-selected`;
      } else {
        return `${baseClasses} seat-selected-other`;
      }
    }
    
    if (seat.isExtraLegroom) {
      return `${baseClasses} seat-extra-legroom`;
    }
    
    if (seat.price && parseFloat(seat.price) > 0) {
      return `${baseClasses} seat-premium`;
    }
    
    return `${baseClasses} seat-available`;
  };

  const groupSeatsByRow = (seats: Seat[]): Record<string, Seat[]> => {
    const rows = seats.reduce((acc: Record<string, Seat[]>, seat) => {
      const row = seat.seatNumber.match(/\d+/)?.[0];
      if (!acc[row!]) acc[row!] = [];
      acc[row!].push(seat);
      return acc;
    }, {});

    // Sort rows numerically and seats alphabetically within each row
    Object.keys(rows).forEach(row => {
      rows[row].sort((a: Seat, b: Seat) => 
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
      );
    });

    return rows;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue"></div>
      </div>
    );
  }

  if (!seats.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No seats available for this flight</p>
        </CardContent>
      </Card>
    );
  }

  const seatRows = groupSeatsByRow(seats);
  const sortedRowNumbers = Object.keys(seatRows).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-6">
      {/* Seat Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5" />
            <span>Seat Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 seat-available rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 seat-occupied rounded"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 seat-selected rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 seat-premium rounded"></div>
              <span>Premium (+$25)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 seat-extra-legroom rounded"></div>
              <span>Extra Legroom (+$45)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft Cabin */}
      <Card className="bg-gradient-to-b from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Plane className="h-8 w-8 text-airline-blue mx-auto mb-2" />
            <h3 className="font-semibold">Boeing 737-800</h3>
            <p className="text-sm text-gray-600">Select your preferred seat</p>
          </div>

          {/* Seat Grid */}
          <div className="max-w-md mx-auto space-y-1">
            {/* Business Class */}
            {sortedRowNumbers.filter(row => parseInt(row) <= 5).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-center mb-3 text-purple-700">
                  Business Class
                </h4>
                {sortedRowNumbers
                  .filter(row => parseInt(row) <= 5)
                  .map(rowNumber => (
                    <div key={rowNumber} className="flex items-center justify-center space-x-1 mb-1">
                      <span className="w-6 text-xs text-gray-500 text-center">{rowNumber}</span>
                      {seatRows[rowNumber].map((seat: any) => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          className={getSeatClassName(seat)}
                          disabled={!seat.isAvailable}
                          title={`Seat ${seat.seatNumber} - ${seat.seatType} - ${seat.isAvailable ? 'Available' : 'Occupied'}`}
                        >
                          {seat.seatNumber.slice(-1)}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {/* Economy Class */}
            <div>
              <h4 className="text-sm font-medium text-center mb-3 text-airline-blue">
                Economy Class
              </h4>
              {sortedRowNumbers
                .filter(row => parseInt(row) > 5)
                .map(rowNumber => (
                  <div key={rowNumber} className="flex items-center justify-center space-x-1 mb-1">
                    <span className="w-6 text-xs text-gray-500 text-center">{rowNumber}</span>
                    {seatRows[rowNumber].map((seat: any, index: number) => (
                      <Fragment key={seat.id}>
                        <button
                          onClick={() => handleSeatClick(seat)}
                          className={getSeatClassName(seat)}
                          disabled={!seat.isAvailable}
                          title={`Seat ${seat.seatNumber} - ${seat.seatType} - ${seat.isAvailable ? 'Available' : 'Occupied'}${seat.isExtraLegroom ? ' - Extra Legroom' : ''}${seat.price && parseFloat(seat.price) > 0 ? ` - $${seat.price}` : ''}`}
                        >
                          {seat.seatNumber.slice(-1)}
                        </button>
                        {/* Add aisle gap after C and before D */}
                        {index === 2 && <div className="w-4"></div>}
                      </Fragment>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Selected Seats Info */}
          {selectedSeatIds.length > 0 && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4 text-center">
              <h4 className="font-semibold mb-2">Selected Seats</h4>
              {selectedSeatIds.map((seatId, index) => {
                const seat = seats.find((s: any) => s.id === seatId);
                if (!seat) return null;
                return (
                  <div key={index} className="mb-3 pb-3 border-b border-blue-200 last:border-b-0">
                    <p className="text-xs text-gray-500">Passenger {index + 1}</p>
                    <p className="font-medium">Seat {seat.seatNumber}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {seat.seatType.replace('_', ' ')} • {seat.seatClass}
                    </p>
                    {seat.isExtraLegroom && (
                      <Badge className="mt-1">Extra Legroom</Badge>
                    )}
                    <p className="text-lg font-bold text-airline-blue mt-2">
                      {seat.price && parseFloat(seat.price) > 0 ? `+$${seat.price}` : 'Included'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
