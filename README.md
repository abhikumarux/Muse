# Muse: AI-Powered Apparel Design & Commerce

Muse is a cross-platform mobile application that allows users to transform their images into unique, AI-generated designs and print them on custom apparel. The app provides a seamless experience from creation to fulfillment, leveraging a powerful combination of **React Native**, **AWS**, **Google's Gemini AI**, and the **Printful API**.

## Core Features

* **Personalized AI Personas (Muses):** Select a pre-loaded "Muse" character or create your own with a custom prompt (e.g., "A futuristic race car driver"). The selected Muse's personality will influence and guide the theme of all your generated designs.
* **AI Image Blending:** Upload one or two images, and the AI, guided by your Muse, will blend them into a unique, artistic design.
* **Product Customization:** Choose from a variety of apparel from the Printful catalog, select your desired color, size, and design placement (front, back, sleeves, etc.).
* **Live Mockup Preview:** See a realistic mockup of how your generated design will look on the final product before making any decisions.
* **Design Iteration:** "Remix" your generated design by providing new text prompts for quick and creative variations.
* **E-commerce Integration:** Add your finished products directly to your connected Printful store for easy ordering and fulfillment.
* **Store & Design Management:** View and manage your Printful products and saved designs directly within the app.

## How It Works

The app guides users through a creative journey from concept to tangible product:

1.  **Connect Printful Store**: Before creating, users connect their Printful account via an API key in the settings, enabling seamless product syncing.
2.  **Choose a Muse**: The user selects or creates a Muse to set the creative direction for their design session. The app is pre-loaded with examples to try.
3.  **Select a Product**: Users browse product categories from the Printful API, select an item, and choose a specific color and size.
4.  **Generate AI Design**: The user uploads one or two inspiration images. These are sent to the **Google Gemini Pro Vision API**, which generates a new, blended image that inherits the personality of the selected Muse.
5.  **Apply and Refine**: The AI design is applied to a mockup of the product. From here, the user can:
    * **Add to Store:** Pushes the final product to their Printful store.
    * **Save Design:** Saves the generated artwork to their in-app collection to use later.
    * **Remix:** Provides a new text prompt to the AI to alter the current design.
    * **Photoshoot:** Enters an interactive mode to adjust the placement, scale, and alignment of the design on the apparel.

## Architecture & Tech Stack

* **Frontend**: Built with **React Native** and **Expo**, using **Expo Router** for file-based navigation.
* **Backend (Cloud Infrastructure)**:
    * **Authentication**: **AWS Cognito** for managing user sign-up, sign-in, and secure access.
    * **Database**: **Amazon DynamoDB** for storing user data, saved designs, Muse personas, and Printful API keys.
    * **File Storage**: **Amazon S3** for hosting user-uploaded images and AI-generated designs.
* **Third-Party APIs**:
    * **AI Model**: **Google Gemini Pro Vision** for all image generation, blending, and remixing.
    * **Fulfillment**: **Printful API** for product catalogs, mockup generation, and e-commerce store integration.

## Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

* Node.js 18+
* npm or yarn
* Expo CLI

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/abhikumarux/Muse.git](https://github.com/abhikumarux/Muse.git)
    ```
    ```bash
    cd Muse
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    
3.  **Start the development server:**
    ```bash
    npx expo start
    ```

## License

This project is licensed under the MIT License.
