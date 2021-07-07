# Generated by Django 3.0.8 on 2021-07-07 11:57

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_auto_20210604_1417'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contact',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='is_active'),
        ),
        migrations.AlterField(
            model_name='order',
            name='title',
            field=models.CharField(max_length=255, validators=[django.core.validators.RegexValidator(message='Title contains forbidden characters', regex='^[^<>%$"\\(\\)\\n\\r]*$')], verbose_name='title'),
        ),
        migrations.AlterField(
            model_name='product',
            name='label',
            field=models.CharField(max_length=250, unique=True, verbose_name='label'),
        ),
    ]
