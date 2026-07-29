# WasteWise Connect

You are a senior software architect, senior full-stack engineer, DevOps engineer, UI/UX designer, database architect, cybersecurity engineer, QA engineer, and technical writer.

Your task is to build an enterprise-grade production-ready Garbage Tracker System from scratch.

This is NOT a prototype.

This is NOT a demo.

This should be production quality.

==================================================

PROJECT

==================================================

Project Name:

Garbage Tracker

Purpose:

Develop a modern web platform that digitizes waste management by connecting:

• Residents

• Garbage Collectors

• Municipal Authorities

• System Administrators

The platform must allow residents to report garbage accumulation, upload evidence, attach GPS coordinates, monitor collection status, and receive notifications.

Collectors should receive assigned jobs, navigate to locations, update progress, upload completion photos, and manage routes.

Administrators should monitor the entire operation through dashboards, analytics, maps, reports and management tools.

==================================================

TECH STACK

==================================================

Frontend

Next.js 15

React 19

TypeScript

TailwindCSS

Shadcn UI

Framer Motion

TanStack Query

React Hook Form

Zod

Leaflet Maps

Chart.js

Recharts

Backend

Laravel 12

PHP 8.4

Authentication

Laravel Sanctum

API

REST API

Database

MySQL

Storage

Local Storage

Amazon S3 compatible

Maps

OpenStreetMap

Leaflet

Notifications

Email

SMS abstraction layer

Push Notifications

Queues

Laravel Queue

Redis

Caching

Redis

Search

Laravel Scout

Testing

Pest

PHPUnit

Playwright

Deployment

Docker

Docker Compose

Nginx

GitHub Actions

==================================================

USER ROLES

==================================================

Resident

Collector

Supervisor

Administrator

System Super Admin

==================================================

FEATURES

==================================================

Authentication

• Register

• Login

• Email Verification

• Password Reset

• Two-factor authentication

• Session Management

Residents

Residents can

Create garbage reports

Upload multiple photos

Capture GPS automatically

Manually adjust location

Write description

Select garbage category

Estimate size

Mark urgency

View report history

Track report status

Receive notifications

View nearby reports

Edit report before assignment

Delete report before assignment

Comment on reports

Rate completed collections

Download report history

Collectors

Collectors can

Receive assigned jobs

View assigned reports

Navigate using maps

Update status

Accepted

Travelling

Working

Completed

Rejected

Upload completion images

Record completion time

Add notes

Report obstacles

View work history

Supervisor

Assign collectors

Reassign jobs

Monitor collector location

Monitor live jobs

Approve completion

Reject completion

Generate reports

Administrator

Dashboard

User Management

Collector Management

Role Management

Permissions

Garbage Categories

Priority Management

Announcements

Analytics

Reports

Audit Logs

System Settings

Notification Templates

==================================================

REPORT WORKFLOW

==================================================

Resident creates report

↓

Supervisor receives notification

↓

Assign collector

↓

Collector accepts

↓

Travelling

↓

Working

↓

Uploads completion photos

↓

Supervisor verifies

↓

Completed

↓

Resident receives notification

↓

Resident rates service

==================================================

MAP FEATURES

==================================================

Interactive Map

Marker clustering

Heat maps

Garbage hotspots

Collector locations

Routing

Distance calculations

Nearby reports

Live updates

==================================================

DASHBOARDS

==================================================

Admin Dashboard

Reports Today

Pending

Completed

Average response time

Collection efficiency

Heatmaps

Charts

KPIs

Collector Dashboard

Today's Jobs

Pending

Completed

Navigation

Resident Dashboard

My Reports

Current Status

Statistics

Notifications

==================================================

ANALYTICS

==================================================

Top dirty streets

Most reported locations

Collection trends

Average response time

Completion time

Collector productivity

Monthly reports

Yearly reports

Map heatmaps

Predictive insights ready

==================================================

DATABASE

==================================================

Design a fully normalized database.

Create

ER Diagram

Relationships

Indexes

Foreign Keys

Soft Deletes

Audit Tables

Migration Files

Seeders

Factories

==================================================

SECURITY

==================================================

Implement

RBAC

Authorization Policies

CSRF

XSS protection

SQL Injection prevention

Rate Limiting

Input Validation

Image Validation

Secure File Upload

Activity Logs

Audit Logs

Encrypted Sensitive Data

Security Headers

==================================================

API

==================================================

Build a complete REST API.

Document with OpenAPI.

Version APIs.

Implement pagination.

Filtering

Sorting

Searching

Rate limiting

Proper HTTP codes

==================================================

NOTIFICATIONS

==================================================

Email

SMS abstraction

Push Notifications

In-App Notifications

==================================================

ADMIN REPORTS

==================================================

Export

PDF

Excel

CSV

Generate

Daily

Weekly

Monthly

Annual Reports

==================================================

FILE MANAGEMENT

==================================================

Multiple image upload

Compression

Thumbnail generation

Secure storage

S3 support

==================================================

SYSTEM SETTINGS

==================================================

Manage

Municipality name

Logo

Working hours

Notification settings

SMS provider

Email provider

Google Maps keys

OpenStreetMap settings

==================================================

TESTING

==================================================

Unit Tests

Feature Tests

Integration Tests

API Tests

UI Tests

Performance Tests

==================================================

DEVOPS

==================================================

Provide

Docker setup

Docker Compose

GitHub Actions CI/CD

Production deployment guide

Nginx configuration

Supervisor configuration

Queue configuration

Redis configuration

Environment examples

==================================================

DOCUMENTATION

==================================================

Generate

Software Requirements Specification

System Design Document

API Documentation

Installation Guide

Deployment Guide

Developer Guide

Administrator Manual

User Manual

Maintenance Guide

Database Documentation

==================================================

UI REQUIREMENTS

==================================================

Modern

Minimal

Responsive

Accessible (WCAG)

Dark Mode

Light Mode

Mobile First

Professional municipality dashboard

==================================================

DIAGRAMS

==================================================

Generate

Use Case Diagram

Class Diagram

Sequence Diagram

Activity Diagram

ER Diagram

Component Diagram

Deployment Diagram

Flowcharts

==================================================

PROJECT STRUCTURE

==================================================

Follow enterprise architecture.

Use

Repository Pattern

Service Layer

DTOs

Form Requests

Events

Listeners

Policies

Observers

Traits

Enums

Resources

API Resources

Background Jobs

Queues

Caching

SOLID Principles

Clean Architecture

==================================================

CODE QUALITY

==================================================

Strict typing

Reusable components

Reusable services

No duplicated code

Production logging

Error handling

Meaningful commits

Comprehensive comments only where necessary

PSR-12 compliance

==================================================

DELIVERABLES

==================================================

Generate the complete source code.

Generate all migrations.

Generate all seeders.

Generate all controllers.

Generate all services.

Generate all React components.

Generate all APIs.

Generate all pages.

Generate dashboards.

Generate authentication.

Generate testing.

Generate deployment configuration.

Generate documentation.

Nothing should be omitted.

The application must be deployable immediately after configuring environment variables.

Do not produce placeholder code.

Produce production-ready code only.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://garbagetrackerzm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8afb09e0-889b-41ff-80a9-d0f42ecbeb1a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
