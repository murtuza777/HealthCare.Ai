# Healthcare.AI

An advanced health monitoring and management platform powered by AI for early disease detection and patient health management.

## Key Features

1. **Patient Overview Dashboard**
   - Track and visualize vital health metrics
   - Receive personalized health insights and advice based on your data
   - Monitor trends and changes in your health status
   - Input and manage health data including vitals, conditions, and medications

2. **Health Guardian AI Assistant**
   - Advanced AI-powered medical assistant that can answer ANY healthcare question
   - Comprehensive knowledge of medical conditions, treatments, and terminology
   - Personalized health advice based on patient data and health metrics
   - Medication guidance, symptom assessment, and early disease detection
   - Powered by Deepseek's large language model for accurate medical information

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
- Deepseek AI for comprehensive medical responses

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
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## AI Configuration

This application uses the Deepseek API to power the Health Guardian AI assistant, providing comprehensive and accurate medical information.

To set up the AI component:

1. Obtain a Deepseek API key from [Deepseek](https://platform.deepseek.com)
2. Add your API key to the `.env.local` file as shown above
3. For development without an API key, the system falls back to template responses for common health questions

The AI assistant is capable of:
- Answering detailed questions about any medical condition, treatment, or health topic
- Analyzing personal health metrics for early warning signs
- Providing personalized health recommendations based on user data
- Explaining medical terminology in clear, understandable language
- Interpreting lab results and medical reports

## Project Structure

```
healthcare.ai/
├── app/                      # Next.js app directory with App Router
│   ├── api/                 # API routes and endpoints
│   ├── auth/                # Authentication-related pages
│   ├── components/          # App-specific UI components
│   ├── context/             # React context providers
│   │   ├── AuthContext.tsx  # Authentication context
│   │   └── PatientContext.tsx # Patient data management
│   ├── dashboard/           # Dashboard pages and components
│   ├── home/                # Home page components
│   ├── lib/                 # App-specific utilities
│   ├── reports/             # Reports management features
│   │   ├── add/             # Upload/add reports feature
│   │   ├── gallery/         # Reports gallery and management
│   │   ├── qr-code/         # QR code generation
│   │   ├── scan-qr/         # QR code scanning
│   │   └── view-shared/     # Shared reports viewer
│   ├── utils/               # Utility functions
│   ├── ClientLayout.tsx     # Client-side layout wrapper
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── middleware.ts        # Next.js middleware for auth
│   └── page.tsx             # Home page
├── components/              # Shared React components
├── data/                    # Static data files
├── drizzle/                 # Database migrations and schema
├── lib/                     # Global utility functions
│   ├── supabase.ts          # Supabase client configuration
│   └── utils.ts             # General utility functions
├── migrations/              # Database migration scripts
├── public/                  # Static assets
├── src/                     # Source code (for non-app router code)
├── styles/                  # Global styles
├── .eslintrc.json           # ESLint configuration
├── .gitignore               # Git ignore file
├── components.json          # UI component configuration
├── drizzle.config.ts        # Drizzle ORM configuration
├── next.config.js           # Next.js configuration
├── package.json             # Project dependencies
├── postcss.config.js        # PostCSS configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

### Key Architectural Features

1. **App Router Structure**: Uses Next.js 14 App Router for improved routing and server components.

2. **Context Management**: 
   - `AuthContext`: Handles user authentication state and methods
   - `PatientContext`: Manages patient data and health records

3. **Reports System Architecture**:
   - Document storage in Supabase Storage Buckets
   - Metadata stored in database with Row Level Security (RLS)
   - QR code-based sharing system with time-limited access
   - Gallery view with search and filtering capabilities

4. **Authentication and Security**:
   - Supabase authentication with Row Level Security
   - Protected routes with middleware
   - Secure data access patterns
   
5. **AI Integration**:
   - Gemini AI integration for health assistant
   - Contextual responses based on patient data
   - Medical terminology processing
   
6. **Responsive UI Components**:
   - Tailwind CSS for styling
   - Framer Motion for animations
   - Custom health visualization components

## Use Cases

- **Early Disease Detection**: The system analyzes patient data to detect potential health issues early
- **Medication Management**: Helps patients stay on top of their medication schedules
- **Remote Monitoring**: Allows healthcare providers to monitor patients remotely
- **Health Trends Analysis**: Identify long-term patterns in health data
- **Care Coordination**: Facilitates communication between patients, caretakers, and healthcare providers
- **Medical Education**: Provides comprehensive information about health conditions and treatments

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
