import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

export function ActivityFilters({ 
  filters, 
  onFiltersChange, 
  onDateRangeChange,
  dateRange,
  availableActivityTypes = []
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      activityType: 'all',
      minDistance: '',
      maxDistance: '',
      titleKeywords: '',
      notesKeywords: ''
    };
    onFiltersChange(clearedFilters);
  };

  const clearDateRange = () => {
    onDateRangeChange({ from: null, to: null });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    value && value.toString().trim() !== '' && !(key === 'activityType' && value === 'all')
  ).length;
  const hasDateRange = dateRange && (dateRange.from || dateRange.to);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            {(activeFilterCount > 0 || hasDateRange) && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount + (hasDateRange ? 1 : 0)} active
              </Badge>
            )}
            {(activeFilterCount > 0 || hasDateRange) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  clearFilters();
                  clearDateRange();
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Range</label>
          <div className="flex items-center gap-2">
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    onDateRangeChange(range || { from: null, to: null });
                    if (range?.from && range?.to) {
                      setShowDatePicker(false);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {hasDateRange && (
              <Button variant="outline" size="sm" onClick={clearDateRange}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Activity Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Type</label>
            <Select 
              value={filters.activityType || 'all'} 
              onValueChange={(value) => handleFilterChange('activityType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {availableActivityTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distance Range Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Distance</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minDistance || ''}
              onChange={(e) => handleFilterChange('minDistance', e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Distance</label>
            <Input
              type="number"
              placeholder="∞"
              value={filters.maxDistance || ''}
              onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Title Keywords Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title Keywords</label>
            <Input
              type="text"
              placeholder="Search titles..."
              value={filters.titleKeywords || ''}
              onChange={(e) => handleFilterChange('titleKeywords', e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Notes Keywords Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes Keywords</label>
            <Input
              type="text"
              placeholder="Search notes..."
              value={filters.notesKeywords || ''}
              onChange={(e) => handleFilterChange('notesKeywords', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {(activeFilterCount > 0 || hasDateRange) && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
              {filters.activityType && filters.activityType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {filters.activityType}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => handleFilterChange('activityType', 'all')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.minDistance && (
                <Badge variant="secondary" className="text-xs">
                  Min: {filters.minDistance}km
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => handleFilterChange('minDistance', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.maxDistance && (
                <Badge variant="secondary" className="text-xs">
                  Max: {filters.maxDistance}km
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => handleFilterChange('maxDistance', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.titleKeywords && (
                <Badge variant="secondary" className="text-xs">
                  Title: "{filters.titleKeywords}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => handleFilterChange('titleKeywords', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.notesKeywords && (
                <Badge variant="secondary" className="text-xs">
                  Notes: "{filters.notesKeywords}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => handleFilterChange('notesKeywords', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {hasDateRange && (
                <Badge variant="secondary" className="text-xs">
                  {dateRange.from && format(dateRange.from, "MMM dd")}
                  {dateRange.to && ` - ${format(dateRange.to, "MMM dd")}`}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={clearDateRange}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}