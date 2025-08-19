import { useState } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import "./date-range-picker.css";

export function DateRangePicker({ 
  value, 
  onChange, 
  className = "", 
  placeholder = "Pick date range" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(value?.from || null);
  const [endDate, setEndDate] = useState(value?.to || null);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    
    if (onChange) {
      onChange({
        from: start,
        to: end
      });
    }
    
    // Close popover when both dates are selected
    if (start && end) {
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${format(startDate, "LLL dd, y")} - ${format(endDate, "LLL dd, y")}`;
    } else if (startDate) {
      return format(startDate, "LLL dd, y");
    }
    return placeholder;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal text-sm ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 z-50" align="start" sideOffset={8}>
        <div className="react-datepicker-container">
          <DatePicker
            selected={startDate}
            onChange={handleDateChange}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            inline
            calendarClassName="border-0 shadow-none"
            monthsShown={1}
            maxDate={new Date()}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}