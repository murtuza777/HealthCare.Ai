# Healthcare.AI

An advanced health monitoring and management platform powered by AI for early disease detection and patient health management.

## Key Features

1. **Patient Overview Dashboard**
   - Track and visualize vital health metrics
   - Receive personalized health insights and advice based on your data
   - Monitor trends and changes in your health status
   - Input and manage health data including vitals, conditions, and medications

2. **HeartGuard AI Assistant**
   - Intelligent AI-powered health chat
   - Personalized health advice based on patient data
   - Medication guidance and symptom assessment
   - Utilizes reports and health profile data for accurate recommendations

3. **Reports Management System**
   - Securely store medical reports and test results
   - Share reports with healthcare providers via QR codes
   - Scan and digitize paper reports
   - Manage patient identification and secure sharing

4. **Caretaker Management**
   - Set up reminders for medications, exercises, and appointments
   - Assign and manage caretakers for patient monitoring
   - Configure notifications for health events
   - Coordinate care among multiple care providers

5. **Health Timeline**
   - Comprehensive view of health history and events
   - Filter and search through past health records
   - Track interactions with healthcare system
   - Identify patterns and trends in health data

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase for authentication and database

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/murtuza777/Healthcare.AI.git
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
healthcare.ai/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── dashboard/         # Dashboard pages
│   ├── reports/           # Reports management
│   └── components/        # UI components
├── components/            # Shared React components
├── lib/                   # Utility functions
│   └── supabase.ts       # Supabase client
└── public/               # Static assets
```

## Use Cases

- **Early Disease Detection**: The system analyzes patient data to detect potential health issues early
- **Medication Management**: Helps patients stay on top of their medication schedules
- **Remote Monitoring**: Allows healthcare providers to monitor patients remotely
- **Health Trends Analysis**: Identify long-term patterns in health data
- **Care Coordination**: Facilitates communication between patients, caretakers, and healthcare providers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Team

- Project Lead: [Your Name]
- UI/UX Design: [Designer Name]
- Frontend Development: [Frontend Dev Name]
- Backend Development: [Backend Dev Name]

## Acknowledgments

- Medical visualization inspired by professional cardiac monitoring systems
- Heart animation developed with guidance from medical professionals
