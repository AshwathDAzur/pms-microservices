<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false displayWide=false showAnotherWayIfPresent=true>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>

<body>
    <div class="pms-login-container">
        <!-- LEFT SIDE: Form -->
        <div class="pms-login-left">
            <div class="pms-logo">PMS</div>

            <div class="pms-form-container">
                <h1 class="pms-title">Welcome back!</h1>
                <p class="pms-subtitle">Enter to get unlimited access to data & information.</p>

                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div class="pms-alert pms-alert-${message.type}">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                </#if>

                <#nested "form">

                <#if displayInfo>
                    <#nested "info">
                </#if>

                <#nested "socialProviders">
            </div>
        </div>

        <!-- RIGHT SIDE: Gradient + Illustration -->
        <div class="pms-login-right">
            <div class="pms-illustration">
                <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Decorative background shapes -->
                    <rect x="20" y="30" width="80" height="80" rx="12" fill="#3b82f6" opacity="0.3"/>
                    <rect x="300" y="50" width="60" height="60" rx="8" fill="#60a5fa" opacity="0.4"/>
                    <circle cx="350" cy="300" r="70" fill="#1e40af" opacity="0.3"/>
                    <rect x="30" y="280" width="100" height="100" rx="16" fill="#3b82f6" opacity="0.2"/>

                    <!-- Grid pattern -->
                    <rect x="280" y="180" width="100" height="80" rx="8" fill="#1e3a5f" stroke="#3b82f6" stroke-width="2"/>
                    <line x1="280" y1="200" x2="380" y2="200" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
                    <line x1="280" y1="220" x2="380" y2="220" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
                    <line x1="280" y1="240" x2="380" y2="240" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
                    <line x1="310" y1="180" x2="310" y2="260" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
                    <line x1="340" y1="180" x2="340" y2="260" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>

                    <!-- Center people icon -->
                    <circle cx="200" cy="180" r="40" fill="#3b82f6"/>
                    <path d="M200 230 C150 230 120 270 120 310 L120 340 C120 348 126 354 134 354 L266 354 C274 354 280 348 280 340 L280 310 C280 270 250 230 200 230Z" fill="#3b82f6"/>

                    <!-- Left person -->
                    <circle cx="80" cy="200" r="28" fill="#60a5fa"/>
                    <path d="M80 235 C45 235 25 265 25 295 L25 315 C25 321 30 326 36 326 L124 326 C130 326 135 321 135 315 L135 295 C135 265 115 235 80 235Z" fill="#60a5fa"/>

                    <!-- Right person -->
                    <circle cx="320" cy="320" r="25" fill="#60a5fa"/>
                    <path d="M320 350 C290 350 270 375 270 400 L370 400 C370 375 350 350 320 350Z" fill="#60a5fa"/>

                    <!-- Decorative elements -->
                    <circle cx="160" cy="80" r="12" fill="#fbbf24"/>
                    <polygon points="250,60 258,76 276,78 263,91 266,109 250,101 234,109 237,91 224,78 242,76" fill="#fbbf24"/>

                    <!-- Small accent shapes -->
                    <circle cx="60" cy="120" r="6" fill="#f97316"/>
                    <circle cx="340" cy="120" r="8" fill="#14b8a6"/>
                    <rect x="150" y="320" width="40" height="8" rx="4" fill="#60a5fa" opacity="0.6"/>
                    <rect x="150" y="335" width="60" height="8" rx="4" fill="#60a5fa" opacity="0.4"/>
                    <rect x="150" y="350" width="30" height="8" rx="4" fill="#60a5fa" opacity="0.3"/>

                    <!-- Connection lines -->
                    <path d="M110 280 Q150 250 180 270" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
                </svg>
            </div>

            <!-- Decorative dots -->
            <div class="pms-dots">
                <span class="dot dot-1"></span>
                <span class="dot dot-2"></span>
                <span class="dot dot-3"></span>
                <span class="dot dot-4"></span>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
