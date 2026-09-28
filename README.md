# Aerowing Airlines

Aerowing Airlines is a comprehensive, modern airline management and flight reservation platform powered by Spring Boot, JPA/Hibernate, and responsive web technologies. The platform provides an end-to-end digital experience for passengers—including intelligent flight search for direct and multi-leg journeys, interactive seat selection, booking management, loyalty program tracking, and an integrated AI travel assistant—coupled with a robust administrative portal for flight operations, fleet and crew management, occupancy tracking, and reporting.

## Features

- Passenger authentication
- Admin authentication
- Flight management
- Flight search
- Direct flights
- Connecting flights
- Multi-leg journey
- Passenger booking
- Seat selection
- Dynamic pricing
- Loyalty system
- Payment simulation
- Booking cancellation/refund
- Crew management
- Aircraft management
- Admin dashboard
- Reports
- AI travel assistant

## Technology

- Java
- Spring Boot
- Spring Security
- JPA/Hibernate
- MariaDB/MySQL
- HTML
- CSS
- JavaScript
- Gemini API

## Local Development

Run the application locally using the existing Maven Wrapper:

```bash
./mvnw spring-boot:run
```

Once started, the application will be available at:
```
http://localhost:8080
```

## Environment Variables

Configure the following environment variable names (or set them via a local `.env` file):

- `DB_URL` - Database JDBC connection URL (e.g., `jdbc:mysql://127.0.0.1:3306/airline_db`)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `GEMINI_API_KEY` - Google Gemini API Key for the AI travel assistant
- `GEMINI_MODEL` - Google Gemini model identifier (e.g., `gemini-1.5-flash`)
- `JWT_SECRET` - Secret key used for JWT token signing (if overridden)

Refer to `.env.example` for the environment template.

## Security

Never commit API keys, passwords, JWT secrets, database credentials, database dumps, or .env files. Always use environment variables or git-ignored local property files for sensitive configurations.

## Project Structure

```
airline-management/
├── .mvn/                               # Maven wrapper files
├── mvnw                                # Maven wrapper executable (Unix)
├── mvnw.cmd                            # Maven wrapper executable (Windows)
├── pom.xml                             # Project object model and dependencies
├── .gitignore                          # Git ignore specification
├── .env.example                        # Template for environment configuration
├── README.md                           # Project documentation
└── src/
    ├── main/
    │   ├── java/com/airline/airline_management/
    │   │   ├── AirlineManagementApplication.java  # Main application entry point
    │   │   ├── config/                            # Security, JWT, and application configs
    │   │   ├── controller/                        # REST API controllers
    │   │   ├── dto/                               # Request/response DTOs
    │   │   ├── model/                             # Database JPA entities
    │   │   ├── repository/                        # Spring Data JPA repositories
    │   │   └── service/                           # Business logic services & AI integration
    │   └── resources/
    │       ├── application.properties             # Spring Boot properties
    │       └── static/                            # Client-side web assets
    │           ├── admin/                         # Admin portal UI and controllers
    │           ├── css/                           # Stylesheets and theme tokens
    │           ├── js/                            # Core client scripts and components
    │           └── *.html                         # HTML pages (search, booking, dashboard, etc.)
    └── test/                                      # Test suites
```
