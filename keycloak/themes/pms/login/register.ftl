<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>
    <#if section = "header">
        ${msg("registerTitle")}
    <#elseif section = "form">
        <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="${properties.kcFormGroupClass!}">
                <label for="email" class="${properties.kcLabelClass!}">${msg("email")} <span class="pms-required">*</span></label>
                <input type="email" id="email" name="email" value="${(register.formData.email!'')}"
                       class="${properties.kcInputClass!}"
                       autocomplete="email"
                       aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"
                       placeholder="Enter your email"/>
                <#if messagesPerField.existsError('email')>
                    <span class="pms-error-message">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="password" class="${properties.kcLabelClass!}">${msg("password")} <span class="pms-required">*</span></label>
                <div class="pms-password-wrapper">
                    <input type="password" id="password" name="password"
                           class="${properties.kcInputClass!}"
                           autocomplete="new-password"
                           aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                           placeholder="Create a password"/>
                    <button type="button" class="pms-password-toggle" onclick="togglePassword('password', this)" aria-label="Show password">
                        <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <svg class="eye-closed" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                    </button>
                </div>
                <#if messagesPerField.existsError('password')>
                    <span class="pms-error-message">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="password-confirm" class="${properties.kcLabelClass!}">${msg("passwordConfirm")} <span class="pms-required">*</span></label>
                <div class="pms-password-wrapper">
                    <input type="password" id="password-confirm" name="password-confirm"
                           class="${properties.kcInputClass!}"
                           autocomplete="new-password"
                           aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                           placeholder="Confirm your password"/>
                    <button type="button" class="pms-password-toggle" onclick="togglePassword('password-confirm', this)" aria-label="Show password">
                        <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <svg class="eye-closed" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                    </button>
                </div>
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="pms-error-message">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="firstName" class="${properties.kcLabelClass!}">${msg("firstName")} <span class="pms-required">*</span></label>
                <input type="text" id="firstName" name="firstName" value="${(register.formData.firstName!'')}"
                       class="${properties.kcInputClass!}"
                       aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>"
                       placeholder="Enter your first name"/>
                <#if messagesPerField.existsError('firstName')>
                    <span class="pms-error-message">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="lastName" class="${properties.kcLabelClass!}">${msg("lastName")} <span class="pms-required">*</span></label>
                <input type="text" id="lastName" name="lastName" value="${(register.formData.lastName!'')}"
                       class="${properties.kcInputClass!}"
                       aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>"
                       placeholder="Enter your last name"/>
                <#if messagesPerField.existsError('lastName')>
                    <span class="pms-error-message">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                </#if>
            </div>

            <#if recaptchaRequired??>
                <div class="form-group">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </div>
            </#if>

            <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                       type="submit" value="${msg("doRegister")}"/>
            </div>

            <div class="pms-back-to-login">
                <span>&laquo; <a href="${url.loginUrl}">${msg("backToLogin", "Back to Login")}</a></span>
            </div>
        </form>

        <script>
            function togglePassword(inputId, button) {
                var input = document.getElementById(inputId);
                var eyeOpen = button.querySelector('.eye-open');
                var eyeClosed = button.querySelector('.eye-closed');

                if (input.type === 'password') {
                    input.type = 'text';
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                } else {
                    input.type = 'password';
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                }
            }
        </script>
    </#if>
</@layout.registrationLayout>
