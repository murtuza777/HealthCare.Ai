'use client';

import { useState } from 'react';
import { FaHeartbeat, FaPills, FaCalendarCheck, FaExclamationTriangle, FaChartLine, FaWeight, FaTint } from 'react-icons/fa';
import { format, subDays, isAfter, isBefore, parseISO, formatDistanceToNow } from 'date-fns';

// Timeline event types
type EventType = 'vital_check' | 'medication' | 'appointment' | 'alert' | 'report' | 'exercise';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: Date;
  metrics?: {
    [key: string]: number | string;
  };
  severity?: 'low' | 'medium' | 'high';
}

export default function HealthTimeline() {
  // Set up state for filtering timeline events
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Sample timeline data - in a real app, this would come from a database
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    {
      id: '1',
      type: 'vital_check',
      title: 'Blood Pressure Check',
      description: 'Routine blood pressure monitoring',
      timestamp: new Date(),
      metrics: {
        systolic: 120,
        diastolic: 80,
      },
    },
    {
      id: '2',
      type: 'medication',
      title: 'Medication Taken',
      description: 'Morning medication regimen completed',
      timestamp: subDays(new Date(), 1),
      metrics: {
        medications: 'Lisinopril, Aspirin',
      },
    },
    {
      id: '3',
      type: 'alert',
      title: 'Elevated Heart Rate',
      description: 'Heart rate spike detected during rest period',
      timestamp: subDays(new Date(), 2),
      metrics: {
        heartRate: 100,
      },
      severity: 'medium',
    },
    {
      id: '4',
      type: 'appointment',
      title: 'Cardiology Checkup',
      description: 'Regular appointment with Dr. Smith',
      timestamp: subDays(new Date(), 4),
      metrics: {
        doctor: 'Dr. Smith',
        location: 'Heart Center',
      },
    },
    {
      id: '5',
      type: 'report',
      title: 'Lab Results',
      description: 'Cholesterol panel results received',
      timestamp: subDays(new Date(), 5),
      metrics: {
        totalCholesterol: 185,
        ldl: 110,
        hdl: 45,
      },
    },
    {
      id: '6',
      type: 'exercise',
      title: 'Walking Exercise',
      description: 'Completed 30 minute walk',
      timestamp: subDays(new Date(), 1),
      metrics: {
        duration: '30 minutes',
        distance: '2.1 km',
        heartRate: '85 avg',
      },
    },
    {
      id: '7',
      type: 'vital_check',
      title: 'Weight Check',
      description: 'Weekly weight measurement',
      timestamp: subDays(new Date(), 6),
      metrics: {
        weight: '72 kg',
        change: '-0.5 kg',
      },
    },
    {
      id: '8',
      type: 'alert',
      title: 'Missed Medication',
      description: 'Evening dose of medication missed',
      timestamp: subDays(new Date(), 3),
      severity: 'medium',
    },
    {
      id: '9',
      type: 'report',
      title: 'ECG Results',
      description: 'ECG test results from hospital visit',
      timestamp: subDays(new Date(), 10),
      metrics: {
        result: 'Normal sinus rhythm',
      },
    },
    {
      id: '10',
      type: 'appointment',
      title: 'Nutritionist Consultation',
      description: 'Diet planning session with nutritionist',
      timestamp: subDays(new Date(), 12),
      metrics: {
        recommendations: 'DASH diet, reduce sodium',
      },
    },
  ]);

  // Filter events based on current filters
  const getFilteredEvents = () => {
    let filtered = [...timelineEvents];
    
    // Filter by time range
    if (timeRange !== 'all') {
      const cutoffDate = timeRange === 'today' ? new Date().setHours(0, 0, 0, 0) :
                        timeRange === 'week' ? subDays(new Date(), 7) :
                        subDays(new Date(), 30);
                        
      filtered = filtered.filter(event => 
        isAfter(event.timestamp, cutoffDate)
      );
    }
    
    // Filter by event type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }
    
    // Sort by most recent first
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'vital_check':
        return <FaTint className="text-blue-500" />;
      case 'medication':
        return <FaPills className="text-purple-500" />;
      case 'appointment':
        return <FaCalendarCheck className="text-green-500" />;
      case 'alert':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'report':
        return <FaChartLine className="text-yellow-500" />;
      case 'exercise':
        return <FaWeight className="text-cyan-500" />;
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const eventDate = new Date(date).setHours(0, 0, 0, 0);
    
    if (eventDate === today) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (eventDate === today - 86400000) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Health Timeline</h2>
            <div className="flex space-x-3">
              <select 
                className="border rounded-md px-3 py-1"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <select 
                className="border rounded-md px-3 py-1"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">All Events</option>
                <option value="vital_check">Vital Checks</option>
                <option value="medication">Medications</option>
                <option value="appointment">Appointments</option>
                <option value="alert">Alerts</option>
                <option value="report">Reports</option>
                <option value="exercise">Exercise</option>
              </select>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="relative">
              {/* Timeline track */}
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Timeline events */}
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div 
                      className={`absolute left-0 top-2 w-5 h-5 rounded-full flex items-center justify-center ${
                        event.severity === 'high' ? 'bg-red-100' : 
                        event.severity === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}
                    >
                      {getEventIcon(event.type)}
                    </div>
                    
                    {/* Event content */}
                    <div 
                      className={`border rounded-lg p-4 ${
                        event.severity === 'high' ? 'border-red-200 bg-red-50' : 
                        event.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-gray-600">{formatDate(event.timestamp)}</p>
                        </div>
                        <button 
                          className="text-red-600 text-sm"
                          onClick={() => setShowDetails(showDetails === event.id ? null : event.id)}
                        >
                          {showDetails === event.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                      
                      <p className="text-gray-600 mt-2">{event.description}</p>
                      
                      {/* Event details */}
                      {showDetails === event.id && event.metrics && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(event.metrics).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500">{key.charAt(0).toUpperCase() + key.slice(1)}: </span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">No events found for the selected filters.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Recent Activity</h4>
            <p className="text-gray-600 text-sm">
              {filteredEvents.length > 0 
                ? `${filteredEvents.length} health events recorded in the selected time period.` 
                : 'No recent activity to analyze.'}
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Most Frequent</h4>
            <p className="text-gray-600 text-sm">
              {filteredEvents.length > 0 
                ? `${getMostFrequentType(filteredEvents)} is your most frequent event type.` 
                : 'No events to analyze.'}
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Alerts</h4>
            <p className="text-gray-600 text-sm">
              {getAlertCount(filteredEvents) > 0 
                ? `${getAlertCount(filteredEvents)} health alerts in this period.` 
                : 'No health alerts in this period.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get most frequent event type
function getMostFrequentType(events: TimelineEvent[]): string {
  const counts: Record<string, number> = {};
  events.forEach(event => {
    counts[event.type] = (counts[event.type] || 0) + 1;
  });
  
  let maxCount = 0;
  let maxType = '';
  
  Object.entries(counts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  });
  
  // Format the type for display
  return maxType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Helper function to count alerts
function getAlertCount(events: TimelineEvent[]): number {
  return events.filter(event => event.type === 'alert').length;
} 