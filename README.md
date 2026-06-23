# HireFlow Resume Analyzer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

A rule-based resume analysis tool that extracts resume information, evaluates ATS readiness, identifies missing skills, and provides actionable career improvement suggestions.

## 🚀 Features

- **Real PDF Parsing**: Uses PDF.js to extract actual text from uploaded PDF resumes
- **Rule-Based ATS Analysis**: Dynamic scoring based on actual resume content (not simulated)
- **Smart Extraction**: Automatically extracts contact info, skills, education, projects, and experience
- **Section Detection**: Identifies resume sections (Summary, Experience, Education, Skills, Projects, Certifications)
- **Skill Detection**: Recognizes 60+ technical skills from a comprehensive dictionary
- **Dynamic Scoring**: ATS score calculated based on actual content (contact info, skills count, sections present, metrics)
- **Personalized Suggestions**: Recommendations based on what's actually missing from your resume
- **Modern UI**: Clean, responsive design that works on all devices
- **Free to Use**: No account required, completely free

## 📸 Screenshots

### Homepage
![Homepage](screenshots/homepage.png)

### Upload Interface
![Upload](screenshots/upload.png)

### Analysis Results
![Results](screenshots/results.png)

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Processing**: PDF.js
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Steps

1. Clone the repository:
```bash
git clone https://github.com/Jayesh01323/hireflow-resume-analyzer.git
cd hireflow-resume-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"

Vercel will automatically detect Next.js and configure everything for you.

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## 📖 Usage

1. Open the application in your browser
2. Click "Analyze Your Resume" or drag and drop your PDF resume
3. Wait for the analysis to complete
4. Review your ATS score and improvement suggestions
5. Apply the recommendations to improve your resume

## 🔧 How It Works

The application uses rule-based analysis to evaluate resumes:

1. **PDF Text Extraction**: Uses PDF.js to extract text from uploaded PDF files
2. **Contact Info Extraction**: Identifies name, email, phone, and links using regex patterns
3. **Section Detection**: Parses resume into sections (Summary, Experience, Education, Skills, Projects, Certifications)
4. **Skill Detection**: Matches text against a dictionary of 60+ technical skills
5. **ATS Scoring**: Calculates score based on:
   - Contact information presence (20 points)
   - Skills detected (25 points)
   - Education section (15 points)
   - Experience section with metrics (20 points)
   - Projects section (10 points)
   - Structure and completeness (10 points)
6. **Suggestions Generation**: Provides personalized recommendations based on missing sections and content

## 📝 Environment Variables

No environment variables are required for the basic rule-based analysis. The application runs entirely client-side with PDF.js for text extraction.

If you want to extend with AI features in the future, you can add:

```env
# Optional: For future AI integration
OPENAI_API_KEY=your_api_key_here
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Jayesh Patil**
- Email: jayesh.patil@example.com
- GitHub: [@Jayesh01323](https://github.com/Jayesh01323)

## 🙏 Acknowledgments

- Built for [Digital Heroes](https://digitalheroesco.com) Developer Trial
- Inspired by the need for accessible resume analysis tools
- Built with modern web technologies

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the author.

---

**Built with ❤️ using HireFlow AI Resume Analyzer**
