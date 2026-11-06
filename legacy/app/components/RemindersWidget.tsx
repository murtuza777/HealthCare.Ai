'use client';

import { useState } from 'react';
import { Card, Title, Text, List, ListItem, Badge, Button } from '@tremor/react';
import { FaBell, FaCheck, FaClock, FaPlus } from 'react-icons/fa';
import { usePatient } from '@/app/context/PatientContext';
import { format, isPast, isToday, parseISO } from 'date-fns';

export default function RemindersWidget() {
  const { reminders, updateReminder, addReminder } = usePatient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    type: '',
    time: ''
  });
  
  if (!reminders) {
    return (
      <Card className="mx-auto">
        <Title>Reminders</Title>
        <Text>Loading reminders...</Text>
      </Card>
    );
  }
  
  try {
    const sortedReminders = [...reminders].sort((a, b) => {
      try {
        const dateA = new Date(a?.time || 0);
        const dateB = new Date(b?.time || 0);
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        console.error('Error sorting reminders:', error);
        return 0;
      }
    });
    
    const handleToggleReminder = async (id: number, isCompleted: boolean) => {
      try {
        await updateReminder(id, !isCompleted);
      } catch (error) {
        console.error('Error toggling reminder:', error);
        alert('Error updating reminder. Please try again.');
      }
    };
    
    const handleAddReminder = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newReminder.type || !newReminder.time) return;
      
      try {
        await addReminder({
          type: newReminder.type,
          time: new Date(newReminder.time),
          is_completed: false
        });
        
        setNewReminder({ type: '', time: '' });
        setShowAddForm(false);
      } catch (error) {
        console.error('Error adding reminder:', error);
        alert('Error adding reminder. Please try again.');
      }
    };
    
    const getReminderLabel = (reminderDate: Date) => {
      try {
        if (isToday(reminderDate)) {
          return `Today at ${format(reminderDate, 'h:mm a')}`;
        } else if (isPast(reminderDate)) {
          return `Overdue: ${format(reminderDate, 'MMM d, h:mm a')}`;
        } else {
          return format(reminderDate, 'MMM d, h:mm a');
        }
      } catch (error) {
        console.error('Error formatting reminder date:', error);
        return 'Invalid date';
      }
    };
    
    const getReminderColor = (reminder: any) => {
      try {
        if (!reminder) return 'gray';
        if (reminder.is_completed) return 'green';
        if (isPast(new Date(reminder.time))) return 'red';
        if (isToday(new Date(reminder.time))) return 'yellow';
        return 'blue';
      } catch (error) {
        console.error('Error determining reminder color:', error);
        return 'gray';
      }
    };
    
    return (
      <Card className="mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title>Reminders</Title>
            <Text>Stay on track with your health tasks</Text>
          </div>
          <Button 
            icon={FaPlus} 
            variant="secondary" 
            size="xs"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add'}
          </Button>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleAddReminder} className="p-3 bg-gray-50 rounded-lg mb-4">
            <div className="space-y-3">
              <div>
                <Text>Reminder Type</Text>
                <input
                  type="text"
                  value={newReminder.type}
                  onChange={(e) => setNewReminder({...newReminder, type: e.target.value})}
                  placeholder="E.g., Medication, Doctor Appointment"
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <Text>Date & Time</Text>
                <input
                  type="datetime-local"
                  value={newReminder.time}
                  onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <Button type="submit" size="xs">
                Add Reminder
              </Button>
            </div>
          </form>
        )}
        
        {sortedReminders.length === 0 ? (
          <Text>No reminders set. Add one to get started.</Text>
        ) : (
          <List>
            {sortedReminders.map((reminder) => (
              <ListItem key={reminder?.id || Math.random()}>
                <div className="flex items-center space-x-2">
                  {reminder?.is_completed ? (
                    <FaCheck className="text-green-500" />
                  ) : (
                    <FaBell className={`text-${getReminderColor(reminder)}-500`} />
                  )}
                  <div className="flex-grow">
                    <div className="font-medium">{reminder?.type || 'Unnamed reminder'}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <FaClock className="mr-1" />
                      {reminder?.time ? getReminderLabel(new Date(reminder.time)) : 'No date set'}
                    </div>
                  </div>
                  <Badge color={getReminderColor(reminder)}>
                    {reminder?.is_completed ? 'Completed' : 
                      reminder?.time && isPast(new Date(reminder.time)) ? 'Overdue' : 
                      reminder?.time && isToday(new Date(reminder.time)) ? 'Today' : 'Upcoming'}
                  </Badge>
                  <button
                    onClick={() => reminder?.id && handleToggleReminder(reminder.id, reminder.is_completed || false)}
                    className={`ml-2 p-1 rounded-full ${
                      reminder?.is_completed 
                        ? 'bg-gray-200 hover:bg-gray-300' 
                        : 'bg-green-100 hover:bg-green-200'
                    }`}
                  >
                    {reminder?.is_completed ? (
                      <span className="text-xs">Undo</span>
                    ) : (
                      <FaCheck className="text-green-500" />
                    )}
                  </button>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    );
  } catch (error) {
    console.error('Error in RemindersWidget:', error);
    return (
      <Card className="mx-auto">
        <Title>Reminders</Title>
        <Text>Error loading reminders. Please refresh the page.</Text>
      </Card>
    );
  }
} 