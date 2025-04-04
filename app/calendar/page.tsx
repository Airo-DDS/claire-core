"use client";

import { useState, useEffect } from 'react';

// Define types
type Appointment = {
  id: string;
  date: Date;
  reason: string;
  patientType: 'NEW' | 'EXISTING';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  patient: {
    firstName: string;
    lastName: string;
  };
};

type AppointmentFormData = {
  date: string;
  time: string;
  patientId: string;
  reason: string;
  patientType: 'NEW' | 'EXISTING';
  notes: string;
  // New patient fields
  newPatientFirstName: string;
  newPatientLastName: string;
  newPatientEmail: string;
  newPatientPhone: string;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
};

// Define appointment data coming from API
interface AppointmentData {
  id: string;
  date: string;
  reason: string;
  patientType: 'NEW' | 'EXISTING';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  patient: {
    firstName: string;
    lastName: string;
  };
}

const CalendarPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    patientId: '',
    reason: '',
    patientType: 'EXISTING',
    notes: '',
    newPatientFirstName: '',
    newPatientLastName: '',
    newPatientEmail: '',
    newPatientPhone: '',
  });
  
  // Time slots for the entire day with 30-minute intervals (24/7 for demo)
  const timeSlots = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', 
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', 
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', 
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  // Load appointments and patients
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const appointmentsRes = await fetch('/api/appointments');
        if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments');
        
        const patientsRes = await fetch('/api/patients');
        if (!patientsRes.ok) throw new Error('Failed to fetch patients');
        
        const appointmentsData = await appointmentsRes.json();
        const patientsData = await patientsRes.json();
        
        // Add parsing of appointment dates here, since they come as strings from the API
        const parsedAppointments = appointmentsData.map((apt: AppointmentData) => ({
          ...apt,
          date: new Date(apt.date)
        }));
        
        setAppointments(parsedAppointments);
        setPatients(patientsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      let patientId = formData.patientId;
      
      // If new patient, create the patient first
      if (formData.patientType === 'NEW') {
        if (!formData.newPatientFirstName || !formData.newPatientLastName) {
          setError('First name and last name are required for new patients');
          return;
        }
        
        // Get the first dentist (assuming we have at least one)
        const usersRes = await fetch('/api/users?role=DENTIST');
        const users = await usersRes.json();
        
        if (users.length === 0) {
          setError('No dentist found in the system');
          return;
        }
        
        const dentistId = users[0].id;
        
        // Create the new patient
        const patientRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.newPatientFirstName,
            lastName: formData.newPatientLastName,
            email: formData.newPatientEmail || null,
            phoneNumber: formData.newPatientPhone || null,
            userId: dentistId
          }),
        });
        
        if (!patientRes.ok) {
          throw new Error('Failed to create new patient');
        }
        
        const newPatient = await patientRes.json();
        patientId = newPatient.id;
        
        // Add the new patient to the local state
        setPatients(prev => [...prev, newPatient]);
      } else if (!formData.patientId) {
        setError('Please select a patient');
        return;
      }
      
      // Create the appointment
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateTime.toISOString(),
          patientId,
          reason: formData.reason,
          patientType: formData.patientType,
          notes: formData.notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appointment');
      }
      
      // Get the new appointment data and add it to the local state
      const newAppointment = await response.json();
      setAppointments(prev => [...prev, { ...newAppointment, date: new Date(newAppointment.date) }]);
      
      // Close form and reset
      setIsFormOpen(false);
      setError(null);
      
      // Reset form data
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        patientId: '',
        reason: '',
        patientType: 'EXISTING',
        notes: '',
        newPatientFirstName: '',
        newPatientLastName: '',
        newPatientEmail: '',
        newPatientPhone: '',
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating appointment:', err);
    }
  };
  
  // Delete an appointment
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete appointment');
      }
      
      // Update local state
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      setError(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting appointment:', err);
    }
  };
  
  // Group appointments by day
  const appointmentsByDay = appointments.reduce((acc, appointment) => {
    const day = appointment.date.toISOString().split('T')[0];
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);
  
  if (loading) {
    return <div className="flex justify-center p-8">Loading calendar...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Appointment Calendar</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsFormOpen(true)}
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Appointment
          </button>
          <a 
            href="/patients"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            View Patients
          </a>
          <a 
            href="/check-availability"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Check Availability
          </a>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Appointment Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New Appointment</h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded shadow-sm">
              <h3 className="font-semibold text-blue-800 mb-2">Appointment Information</h3>
              <ul className="list-disc list-inside text-sm pl-2">
                <li className="mb-1">Hours: 24/7 - ANY day, ANY time (for demo purposes)</li>
                <li className="mb-1">Appointments are scheduled in 30-minute slots</li>
                <li>All times are displayed in your local timezone</li>
              </ul>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium mb-1">Date</label>
                  <input
                    id="date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium mb-1">Time</label>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="patientType" className="block text-sm font-medium mb-1">Patient Type</label>
                  <select
                    id="patientType"
                    name="patientType"
                    value={formData.patientType}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="EXISTING">Existing Patient</option>
                    <option value="NEW">New Patient</option>
                  </select>
                </div>
                
                {formData.patientType === 'EXISTING' ? (
                  <div>
                    <label htmlFor="patientId" className="block text-sm font-medium mb-1">Patient</label>
                    <select
                      id="patientId"
                      name="patientId"
                      value={formData.patientId}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      required={formData.patientType === 'EXISTING'}
                    >
                      <option value="">Select a patient</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-b py-3">
                    <h3 className="font-medium">New Patient Information</h3>
                    
                    <div>
                      <label htmlFor="newPatientFirstName" className="block text-sm font-medium mb-1">First Name</label>
                      <input
                        id="newPatientFirstName"
                        type="text"
                        name="newPatientFirstName"
                        value={formData.newPatientFirstName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required={formData.patientType === 'NEW'}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPatientLastName" className="block text-sm font-medium mb-1">Last Name</label>
                      <input
                        id="newPatientLastName"
                        type="text"
                        name="newPatientLastName"
                        value={formData.newPatientLastName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required={formData.patientType === 'NEW'}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPatientEmail" className="block text-sm font-medium mb-1">Email</label>
                      <input
                        id="newPatientEmail"
                        type="email"
                        name="newPatientEmail"
                        value={formData.newPatientEmail}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPatientPhone" className="block text-sm font-medium mb-1">Phone Number</label>
                      <input
                        id="newPatientPhone"
                        type="tel"
                        name="newPatientPhone"
                        value={formData.newPatientPhone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium mb-1">Reason</label>
                  <input
                    id="reason"
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Calendar View */}
      <div className="space-y-6">
        {Object.entries(appointmentsByDay)
          .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
          .map(([day, dayAppointments]) => (
            <div key={day} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 font-bold">
                {new Date(day).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              <div className="divide-y">
                {dayAppointments
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map(appointment => (
                    <div key={appointment.id} className="p-4 flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">
                            {appointment.date.toLocaleString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                            appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                            appointment.patientType === 'NEW' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.patientType}
                          </span>
                        </div>
                        <div className="mt-1 font-bold">
                          {appointment.patient.firstName} {appointment.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{appointment.reason}</div>
                        {appointment.notes && (
                          <div className="mt-1 text-xs text-gray-500">{appointment.notes}</div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDelete(appointment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          
        {Object.keys(appointmentsByDay).length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No appointments found. Create a new appointment to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage; 