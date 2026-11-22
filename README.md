# QuickKart

A quick-commerce grocery app (in the style of Zepto or Blinkit) built in **vanilla JavaScript with MVC**. There's no framework. Model, View and Controller are kept strictly separate.

---

## Features

- Mobile-first, responsive UI built with CSS custom properties
- Cart with live quantity steppers and totals
- Product search and category filters
- Discounted pricing display

## Architecture

```
model/model.js           State: products, cart, filters
view/
  headerView.js          Search and header
  containerView.js       Product grid
  addandSubButton.js     Quantity stepper component
  cartView/cartView.js   Cart drawer
controller/controller.js Connects view events to model updates and re-renders
```

Views never change state directly. They raise events, the controller updates the model, and the affected views re-render. This is the same one-way data flow React uses, done by hand.

## Getting started

```bash
git clone https://github.com/itsjxi/quickkart.git
cd quickkart
npm install
npm run dev
```
