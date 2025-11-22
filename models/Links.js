import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Link = sequelize.define("Link", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  short_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  stats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0, // click count starts at 0
  },

  last_clicked_time: {
    type: DataTypes.DATE,
    allowNull: true, // null until first click
  },
});

export default Link;
