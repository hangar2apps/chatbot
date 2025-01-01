import { z } from "zod";
import { tool } from "ai";

// Define the weather tool
export const weatherTool = tool({
  description:
    "Get the weather in a location. Example: 'What is the weather in New York?' The weather is given in Fahrenheit",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    try {
      //covert location to lat/long
      const latLonResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=5&appid=${process.env.OPEN_WEATHER_API_KEY}`
      );

      if (!latLonResponse.ok) {
        console.error("error with response");
        return;
      }

      const latLongData = await latLonResponse.json();

    //   console.log(
    //     `City: ${latLongData[0].name}, State: ${latLongData[0].state}, Country: ${latLongData[0].country}`
    //   );

      const lat = latLongData[0].lat;
      const lon = latLongData[0].lon;

      //get weather data for location
      const latLongWeatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=imperial`
      );

      if (!latLongWeatherResponse.ok) {
        console.log("error with latLongWeatherResponse");
        return;
      }

      const latLongWeatherResponseJson = await latLongWeatherResponse.json();

    //   console.log(
    //     `Temp: ${latLongWeatherResponseJson.main.temp}, Description: ${latLongWeatherResponseJson.weather[0].description}`
    //   );

      let result = `Temp: ${latLongWeatherResponseJson.main.temp}, Description: ${latLongWeatherResponseJson.weather[0].description}`;

      return result;
    } catch (error) {
      console.error("error", error);
      throw new Error("Failed to execute weather tool");
    }
  },
});
