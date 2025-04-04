import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean the database
  await prisma.appointment.deleteMany({})
  await prisma.patient.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('Seeding the database...')
  
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@airodental.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
  
  // Create a dentist
  const dentist = await prisma.user.create({
    data: {
      email: 'dentist@airodental.com',
      name: 'Dr. Smith',
      role: 'DENTIST',
    },
  })
  
  // Create a receptionist
  const receptionist = await prisma.user.create({
    data: {
      email: 'receptionist@airodental.com',
      name: 'Jane Doe',
      role: 'RECEPTIONIST',
    },
  })
  
  console.log('Created users:', { admin, dentist, receptionist })
  
  // Create patients
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '555-123-4567',
      dateOfBirth: new Date('1985-05-15'),
      userId: dentist.id,
    },
  })
  
  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phoneNumber: '555-987-6543',
      dateOfBirth: new Date('1990-10-20'),
      userId: dentist.id,
    },
  })
  
  console.log('Created patients:', { patient1, patient2 })
  
  // Create appointments
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const appointment1 = await prisma.appointment.create({
    data: {
      date: tomorrow,
      reason: 'Regular checkup',
      patientType: 'EXISTING',
      status: 'CONFIRMED',
      notes: 'Patient has sensitivity in lower right molar',
      patientId: patient1.id,
    },
  })
  
  const appointment2 = await prisma.appointment.create({
    data: {
      date: nextWeek,
      reason: 'Teeth cleaning',
      patientType: 'EXISTING',
      status: 'SCHEDULED',
      notes: 'Follow-up appointment after filling',
      patientId: patient2.id,
    },
  })
  
  // Add a few more appointments for the week
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  
  const fourDaysFromNow = new Date(today)
  fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4)
  
  await prisma.appointment.create({
    data: {
      date: dayAfterTomorrow,
      reason: 'New patient consultation',
      patientType: 'NEW',
      status: 'CONFIRMED',
      notes: 'First visit, comprehensive exam needed',
      patientId: patient1.id,
    },
  })
  
  await prisma.appointment.create({
    data: {
      date: threeDaysFromNow,
      reason: 'Root canal',
      patientType: 'EXISTING',
      status: 'SCHEDULED',
      notes: 'Patient reported severe pain',
      patientId: patient2.id,
    },
  })
  
  await prisma.appointment.create({
    data: {
      date: fourDaysFromNow,
      reason: 'Wisdom tooth extraction',
      patientType: 'EXISTING',
      status: 'SCHEDULED',
      notes: 'X-rays already taken',
      patientId: patient1.id,
    },
  })
  
  console.log('Created appointments for the week')
  
  console.log('Database seeding completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  }) 