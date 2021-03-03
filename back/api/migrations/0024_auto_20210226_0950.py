# Generated by Django 3.0.8 on 2021-02-26 08:50

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0023_auto_20210224_1542'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contact',
            name='belongs_to',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='belongs_to'),
        ),
        migrations.AlterField(
            model_name='document',
            name='link',
            field=models.URLField(default='https://sitn.ne.ch', help_text='Please complete the above URL', max_length=2000, verbose_name='link'),
        ),
        migrations.AlterField(
            model_name='identity',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='user'),
        ),
        migrations.AlterField(
            model_name='metadata',
            name='copyright',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.Copyright', verbose_name='copyright'),
        ),
        migrations.AlterField(
            model_name='metadata',
            name='modified_user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='modified_user', to=settings.AUTH_USER_MODEL, verbose_name='modified_user'),
        ),
        migrations.AlterField(
            model_name='metadatacontact',
            name='contact_person',
            field=models.ForeignKey(limit_choices_to={'is_public': True}, on_delete=django.db.models.deletion.CASCADE, to='api.Identity', verbose_name='contact_person'),
        ),
        migrations.AlterField(
            model_name='metadatacontact',
            name='metadata',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.Metadata', verbose_name='metadata'),
        ),
        migrations.AlterField(
            model_name='order',
            name='client',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL, verbose_name='client'),
        ),
        migrations.AlterField(
            model_name='order',
            name='invoice_contact',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='invoice_contact', to='api.Contact', verbose_name='invoice_contact'),
        ),
        migrations.AlterField(
            model_name='order',
            name='order_type',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.OrderType', verbose_name='order_type'),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='data_format',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.DataFormat', verbose_name='data_format'),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='product',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.Product', verbose_name='product'),
        ),
        migrations.AlterField(
            model_name='pricinggeometry',
            name='pricing',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='api.Pricing', verbose_name='pricing'),
        ),
        migrations.AlterField(
            model_name='product',
            name='group',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.Product', verbose_name='group'),
        ),
        migrations.AlterField(
            model_name='product',
            name='metadata',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.Metadata', verbose_name='metadata'),
        ),
        migrations.AlterField(
            model_name='product',
            name='pricing',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.Pricing', verbose_name='pricing'),
        ),
        migrations.AlterField(
            model_name='productformat',
            name='data_format',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.DataFormat', verbose_name='data_format'),
        ),
        migrations.AlterField(
            model_name='productformat',
            name='product',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_formats', to='api.Product', verbose_name='product'),
        ),
        migrations.AlterField(
            model_name='userchange',
            name='client',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='client'),
        ),
        migrations.DeleteModel(
            name='ProductValidation',
        ),
    ]
