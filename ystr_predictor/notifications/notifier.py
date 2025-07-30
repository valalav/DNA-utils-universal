# c:\projects\DNA-utils-universal\ystr_predictor\notifications\notifier.py
from typing import Dict, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
import json
from pathlib import Path
import yaml
import logging
from datetime import datetime

class NotificationService:
    def __init__(self, config_path: str = "config/notifications.yml"):
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger("NotificationService")
        
    def _load_config(self, config_path: str) -> Dict:
        """Загружает конфигурацию уведомлений"""
        config_path = Path(config_path)
        if not config_path.exists():
            return self._create_default_config(config_path)
            
        with open(config_path) as f:
            return yaml.safe_load(f)
            
    def _create_default_config(self, config_path: str) -> Dict:
        """Создает конфигурацию по умолчанию"""
        config = {
            'email': {
                'enabled': False,
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'username': '',
                'password': '',
                'recipients': []
            },
            'slack': {
                'enabled': False,
                'webhook_url': ''
            },
            'telegram': {
                'enabled': False,
                'bot_token': '',
                'chat_ids': []
            },
            'templates': {
                'model_retrained': """
                    Model has been retrained successfully
                    Version: {version}
                    Metrics: {metrics}
                """,
                'training_failed': """
                    Model training failed
                    Error: {error}
                """,
                'drift_detected': """
                    Data drift detected
                    Details: {details}
                """,
                'performance_drop': """
                    Model performance drop detected
                    Current metrics: {metrics}
                    Baseline metrics: {baseline}
                """
            }
        }
        
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, 'w') as f:
            yaml.dump(config, f)
            
        return config
        
    async def send_notification(self, template_name: str, data: Dict):
        """Отправляет уведомление по всем настроенным каналам"""
        message = self.config['templates'][template_name].format(**data)
        
        tasks = []
        
        if self.config['email']['enabled']:
            tasks.append(self.send_email(message))
            
        if self.config['slack']['enabled']:
            tasks.append(self.send_slack(message))
            
        if self.config['telegram']['enabled']:
            tasks.append(self.send_telegram(message))
            
        # Отправляем уведомления параллельно
        await asyncio.gather(*tasks)
        
    async def send_email(self, message: str):
        """Отправляет email уведомление"""
        try:
            config = self.config['email']
            msg = MIMEMultipart()
            msg['From'] = config['username']
            msg['To'] = ", ".join(config['recipients'])
            msg['Subject'] = "Model Notification"
            msg.attach(MIMEText(message, 'plain'))
            
            server = smtplib.SMTP(config['smtp_server'], config['smtp_port'])
            server.starttls()
            server.login(config['username'], config['password'])
            server.send_message(msg)
            server.quit()
            
            self.logger.info("Email notification sent successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to send email: {str(e)}")
            
    async def send_slack(self, message: str):
        """Отправляет уведомление в Slack"""
        try:
            webhook_url = self.config['slack']['webhook_url']
            async with aiohttp.ClientSession() as session:
                await session.post(
                    webhook_url,
                    json={'text': message}
                )
                
            self.logger.info("Slack notification sent successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to send Slack notification: {str(e)}")
            
    async def send_telegram(self, message: str):
        """Отправляет уведомление в Telegram"""
        try:
            config = self.config['telegram']
            base_url = f"https://api.telegram.org/bot{config['bot_token']}/sendMessage"
            
            async with aiohttp.ClientSession() as session:
                for chat_id in config['chat_ids']:
                    await session.post(
                        base_url,
                        json={
                            'chat_id': chat_id,
                            'text': message,
                            'parse_mode': 'HTML'
                        }
                    )
                    
            self.logger.info("Telegram notification sent successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to send Telegram notification: {str(e)}")