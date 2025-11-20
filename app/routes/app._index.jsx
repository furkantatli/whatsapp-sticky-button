import { useState, useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
  RadioButton,
  Divider,
  Badge,
  Grid,
  Icon,
  ColorPicker,
  hsbToRgb,
  rgbToHex,
  hexToRgb,
  rgbToHsb,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { PhoneIcon, ChatIcon } from "@shopify/polaris-icons";

// Default configuration
const DEFAULT_CONFIG = {
  isEnabled: true,
  method: "whatsapp", // 'phone' or 'whatsapp'
  phoneNumber: "",
  message: "Hello, I would like to get more information.",
  buttonStyle: "icon", // 'icon' or 'icon_text'
  colorType: "solid", // 'solid' or 'gradient'
  color: "#25D366",
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch existing settings from individual Metafields
  const response = await admin.graphql(
    `#graphql
      query getSettings {
        currentAppInstallation {
          isEnabled: metafield(namespace: "whatsapp_button", key: "isEnabled") { value }
          method: metafield(namespace: "whatsapp_button", key: "method") { value }
          phoneNumber: metafield(namespace: "whatsapp_button", key: "phoneNumber") { value }
          message: metafield(namespace: "whatsapp_button", key: "message") { value }
          buttonStyle: metafield(namespace: "whatsapp_button", key: "buttonStyle") { value }
          colorType: metafield(namespace: "whatsapp_button", key: "colorType") { value }
          color: metafield(namespace: "whatsapp_button", key: "color") { value }
          position: metafield(namespace: "whatsapp_button", key: "position") { value }
        }
      }`
  );

  const responseJson = await response.json();
  const data = responseJson.data.currentAppInstallation;

  const config = {
    isEnabled: data.isEnabled ? data.isEnabled.value === "true" : DEFAULT_CONFIG.isEnabled,
    method: data.method ? data.method.value : DEFAULT_CONFIG.method,
    phoneNumber: data.phoneNumber ? data.phoneNumber.value : DEFAULT_CONFIG.phoneNumber,
    message: data.message ? data.message.value : DEFAULT_CONFIG.message,
    buttonStyle: data.buttonStyle ? data.buttonStyle.value : DEFAULT_CONFIG.buttonStyle,
    colorType: data.colorType ? data.colorType.value : DEFAULT_CONFIG.colorType,
    color: data.color ? data.color.value : DEFAULT_CONFIG.color,
    position: data.position ? data.position.value : DEFAULT_CONFIG.position,
  };

  return json({ config });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const config = JSON.parse(formData.get("config"));

  const ownerId = (await admin.graphql(`{ currentAppInstallation { id } }`).then(r => r.json())).data.currentAppInstallation.id;

  // Save settings as individual Metafields
  const metafields = [
    { namespace: "whatsapp_button", key: "isEnabled", type: "boolean", value: String(config.isEnabled), ownerId },
    { namespace: "whatsapp_button", key: "method", type: "single_line_text_field", value: config.method, ownerId },
    { namespace: "whatsapp_button", key: "phoneNumber", type: "single_line_text_field", value: config.phoneNumber, ownerId },
    { namespace: "whatsapp_button", key: "message", type: "multi_line_text_field", value: config.message, ownerId },
    { namespace: "whatsapp_button", key: "buttonStyle", type: "single_line_text_field", value: config.buttonStyle, ownerId },
    { namespace: "whatsapp_button", key: "colorType", type: "single_line_text_field", value: config.colorType, ownerId },
    { namespace: "whatsapp_button", key: "color", type: "single_line_text_field", value: config.color, ownerId },
    { namespace: "whatsapp_button", key: "position", type: "single_line_text_field", value: config.position, ownerId },
  ];

  const response = await admin.graphql(
    `#graphql
      mutation saveSettings($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: { metafields },
    }
  );

  const responseJson = await response.json();

  if (responseJson.data.metafieldsSet.userErrors.length > 0) {
    return json({ status: "error", errors: responseJson.data.metafieldsSet.userErrors });
  }

  return json({ status: "success", config });
};


export default function Index() {
  const { config: initialConfig } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...initialConfig });
  const [isDirty, setIsDirty] = useState(false);

  // Update local state when config changes
  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Save handler
  const handleSave = () => {
    fetcher.submit(
      { config: JSON.stringify(config) },
      { method: "POST" }
    );
    setIsDirty(false);
  };

  useEffect(() => {
    if (fetcher.data?.status === "success") {
      shopify.toast.show("Settings saved successfully");
    }
  }, [fetcher.data, shopify]);

  // Color presets
  const solidColors = ["#FF0000", "#00FF00", "#0000FF", "#000000", "#25D366"];
  const gradientColors = [
    "linear-gradient(to right, #ff7e5f, #feb47b)",
    "linear-gradient(to right, #00c6ff, #0072ff)",
    "linear-gradient(to right, #a8ff78, #78ffd6)",
  ];

  return (
    <Page>
      <TitleBar title="Whatsapp Sticky Button">
        <button variant="primary" onClick={handleSave} disabled={!isDirty && fetcher.state === "idle"}>
          Save Changes
        </button>
      </TitleBar>

      <Layout>
        {/* Settings Column */}
        <Layout.Section>
          <BlockStack gap="500">

            {/* Enable/Disable */}
            <Card>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Enable Button</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Show the floating contact button on your store.
                  </Text>
                </BlockStack>
                <Button
                  variant={config.isEnabled ? "primary" : "secondary"}
                  onClick={() => handleChange("isEnabled", !config.isEnabled)}
                >
                  {config.isEnabled ? "Enabled" : "Disabled"}
                </Button>
              </InlineStack>
            </Card>

            {/* Communication Method */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Communication Method</Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  How do you want customers to contact you?
                </Text>
                <BlockStack gap="200">
                  <RadioButton
                    label="Phone Call"
                    checked={config.method === "phone"}
                    id="methodPhone"
                    name="method"
                    onChange={() => handleChange("method", "phone")}
                  />
                  <RadioButton
                    label="WhatsApp"
                    checked={config.method === "whatsapp"}
                    id="methodWhatsapp"
                    name="method"
                    onChange={() => handleChange("method", "whatsapp")}
                  />
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Phone Number */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Phone Number</Text>
                <TextField
                  label="Number"
                  value={config.phoneNumber}
                  onChange={(value) => handleChange("phoneNumber", value)}
                  placeholder="e.g. 905551234567"
                  helpText="Enter your number with country code, no spaces or special characters."
                  autoComplete="tel"
                />
                {config.method === "whatsapp" && (
                  <TextField
                    label="Pre-filled Message"
                    value={config.message}
                    onChange={(value) => handleChange("message", value)}
                    multiline={3}
                    autoComplete="off"
                  />
                )}
              </BlockStack>
            </Card>

            {/* Button Style */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Button Style</Text>
                <BlockStack gap="200">
                  <RadioButton
                    label="Circular Icon"
                    checked={config.buttonStyle === "icon"}
                    id="styleIcon"
                    name="buttonStyle"
                    onChange={() => handleChange("buttonStyle", "icon")}
                  />
                  <RadioButton
                    label="Icon + Text"
                    checked={config.buttonStyle === "icon_text"}
                    id="styleIconText"
                    name="buttonStyle"
                    onChange={() => handleChange("buttonStyle", "icon_text")}
                  />
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Button Color */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Button Color</Text>

                <Text variant="bodyMd" as="p" fontWeight="bold">Basic Colors</Text>
                <InlineStack gap="200">
                  {solidColors.map((color) => (
                    <div
                      key={color}
                      onClick={() => {
                        handleChange("colorType", "solid");
                        handleChange("color", color);
                      }}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        cursor: "pointer",
                        border: config.color === color && config.colorType === "solid" ? "2px solid #000" : "1px solid #ccc",
                        boxShadow: config.color === color && config.colorType === "solid" ? "0 0 0 2px white inset" : "none"
                      }}
                    />
                  ))}
                </InlineStack>

                <Text variant="bodyMd" as="p" fontWeight="bold">Gradients (Pro)</Text>
                <InlineStack gap="200">
                  {gradientColors.map((gradient, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        handleChange("colorType", "gradient");
                        handleChange("color", gradient);
                      }}
                      style={{
                        width: "48px",
                        height: "32px",
                        borderRadius: "4px",
                        background: gradient,
                        cursor: "pointer",
                        border: config.color === gradient && config.colorType === "gradient" ? "2px solid #000" : "1px solid #ccc",
                        boxShadow: config.color === gradient && config.colorType === "gradient" ? "0 0 0 2px white inset" : "none"
                      }}
                    />
                  ))}
                </InlineStack>

                <TextField
                  label="Custom Hex"
                  value={config.colorType === 'solid' ? config.color : ''}
                  onChange={(value) => {
                    handleChange("colorType", "solid");
                    handleChange("color", value);
                  }}
                  disabled={config.colorType === 'gradient'}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Position */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Position</Text>
                <BlockStack gap="200">
                  <RadioButton
                    label="Bottom Left"
                    checked={config.position === "bottom_left"}
                    id="posLeft"
                    name="position"
                    onChange={() => handleChange("position", "bottom_left")}
                  />
                  <RadioButton
                    label="Bottom Right"
                    checked={config.position === "bottom_right"}
                    id="posRight"
                    name="position"
                    onChange={() => handleChange("position", "bottom_right")}
                  />
                </BlockStack>
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>

        {/* Preview Column */}
        <Layout.Section variant="oneThird">
          <div style={{ position: "sticky", top: "20px" }}>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Preview</Text>
                <Text variant="bodySm" tone="subdued">See how your button will look.</Text>

                <Box
                  background="bg-surface-secondary"
                  padding="400"
                  borderRadius="200"
                  minHeight="300px"
                  position="relative"
                >
                  {/* Mock Page Content */}
                  <div style={{ opacity: 0.3 }}>
                    <div style={{ height: "20px", width: "60%", background: "#ccc", marginBottom: "10px", borderRadius: "4px" }}></div>
                    <div style={{ height: "10px", width: "90%", background: "#ccc", marginBottom: "5px", borderRadius: "4px" }}></div>
                    <div style={{ height: "10px", width: "80%", background: "#ccc", marginBottom: "5px", borderRadius: "4px" }}></div>
                    <div style={{ height: "100px", width: "100%", background: "#eee", marginTop: "20px", borderRadius: "4px" }}></div>
                  </div>

                  {/* The Button Preview */}
                  {config.isEnabled && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "20px",
                        left: config.position === "bottom_left" ? "20px" : "auto",
                        right: config.position === "bottom_right" ? "20px" : "auto",
                        background: config.color,
                        color: "white",
                        borderRadius: config.buttonStyle === "icon" ? "50%" : "25px",
                        width: config.buttonStyle === "icon" ? "50px" : "auto",
                        height: "50px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: config.buttonStyle === "icon" ? "0" : "0 20px",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {config.method === "phone" ? (
                        <Icon source={PhoneIcon} tone="white" />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      )}

                      {config.buttonStyle === "icon_text" && (
                        <span style={{ marginLeft: "8px", fontWeight: "bold" }}>
                          {config.method === "phone" ? "Call Us" : "WhatsApp"}
                        </span>
                      )}
                    </div>
                  )}
                </Box>
              </BlockStack>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
