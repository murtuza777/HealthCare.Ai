# HeartCare.AI

An advanced cardiac monitoring and health management platform powered by AI.

## Features

- Real-time heart monitoring with AI-powered analysis
- Anatomically accurate heart visualization
- Professional ECG display with medical-grade accuracy
- Secure patient data management
- Responsive and modern user interface

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase for authentication and database

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/HeartCare.AI.git
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
heartcare.ai/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── HeartAnimation.tsx # Heart visualization
├── lib/                   # Utility functions
│   └── supabase.ts       # Supabase client
└── public/               # Static assets
```

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
