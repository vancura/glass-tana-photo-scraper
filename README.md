# Glass to Tana Scraper

A specialized scraper built to extract photo metadata from Glass.photo and import it into Tana workspace using Tana's API.

## Features

- Extracts detailed photo metadata from Glass.photo pages
- Creates structured nodes in Tana with comprehensive photo information
- Saves high-resolution images locally for backup purposes
- Maintains proper error handling and logging
- Uses environment variables for secure API token management

## Technical Details

This application is built with:

- **TypeScript** - Type-safe JavaScript for robust code
- **Node.js** - JavaScript runtime environment
- **Crawlee/CheerioCrawler** - Library for web scraping and data extraction
- **Apify SDK** - Provides actor framework and utilities
- **Tana API Integration** - Sends structured data to Tana workspace

## Extracted Photo Information

The scraper extracts the following metadata from Glass.photo:
- Photo title/description
- Original page URL
- Camera model
- Lens information
- Focal length
- Aperture settings
- ISO value
- Exposure time
- Original date and time
- High-resolution image URL

## Usage

1. Set up your environment:
   ```bash
   # Create a .env file with your Tana API token
   echo "TANA_API_TOKEN=your_token_here" > .env
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the scraper:
   ```bash
   yarn start
   ```

4. For production use:
   ```bash
   yarn build
   yarn start:prod
   ```

## Configuration

- The project uses Tana API with pre-configured attribute IDs for proper data structure
- Photo metadata is organized using a Tana supertag
- Environment variable `TANA_API_TOKEN` is required for API authentication
- The input schema accepts an array of Glass.photo URLs to process

## Development

- Run in development mode:
  ```bash
  yarn start:dev
  ```

- Lint the code:
  ```bash
  yarn lint
  ```

- Fix linting issues:
  ```bash
  yarn lint:fix
  ```

## Security Notes

- API tokens are stored in environment variables, not committed to the repository
- .env files are ignored in .gitignore for security

## Technical Documentation

The application flow:
1. Loads configuration and environment variables
2. Initializes the Actor framework
3. Creates a CheerioCrawler instance that visits each provided Glass.photo URL
4. Extracts photo metadata from Next.js data embedded in the page
5. Transforms and formats this data for Tana API
6. Sends the structured data to Tana workspace
7. Downloads and saves the highest resolution image available locally
8. Also stores the extracted data in the Actor's dataset as backup